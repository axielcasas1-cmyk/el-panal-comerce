-- GLOBAL INGREDIENT INTELLIGENCE v1
-- Task 4: bridge canonical ingredient evidence into the existing Safety Gate.
-- The existing signature and all textual/danger/poultry/supervision rules are preserved.

create or replace function public.dgusteaux_validate_recipe(
  p_recipe jsonb,
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, dgusteaux
as $$
declare
  v_uid uuid := auth.uid();
  v_title text;
  v_ingredients jsonb;
  v_steps jsonb;
  v_allergens jsonb := coalesce(p_context->'allergies','[]'::jsonb);
  v_restrictions jsonb := coalesce(p_context->'restrictions','[]'::jsonb);
  v_recipe_allergens jsonb := coalesce(p_recipe->'allergens','[]'::jsonb);
  v_ing_text text := '';
  v_step_text text := '';
  v_allergen_text text := '';
  v_norm text;
  v_item jsonb;
  v_step jsonb;
  v_new_steps jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_conflict boolean := false;
  v_risk boolean;
  v_servings integer;
  v_catalogue jsonb;
  v_finding jsonb;
  v_condition text;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_recipe is null or jsonb_typeof(p_recipe) <> 'object' then
    return jsonb_build_object('ok',false,'recipe',coalesce(p_recipe,'{}'::jsonb),'warnings',v_warnings,'errors',jsonb_build_array('recipe_object_required'));
  end if;
  v_title := nullif(trim(coalesce(p_recipe->>'title','')), '');
  v_ingredients := coalesce(p_recipe->'ingredients','[]'::jsonb);
  v_steps := coalesce(p_recipe->'steps','[]'::jsonb);
  if v_title is null or length(v_title) > 180 then v_errors := v_errors || '"invalid_title"'::jsonb; end if;
  if jsonb_typeof(v_ingredients) <> 'array' or jsonb_array_length(v_ingredients) < 1 or jsonb_array_length(v_ingredients) > 100 then v_errors := v_errors || '"invalid_ingredients"'::jsonb; end if;
  if jsonb_typeof(v_steps) <> 'array' or jsonb_array_length(v_steps) < 1 or jsonb_array_length(v_steps) > 50 then v_errors := v_errors || '"invalid_steps"'::jsonb; end if;
  begin
    v_servings := coalesce(nullif(p_recipe->>'servings','')::integer,1);
  exception when others then
    v_servings := 0;
  end;
  if v_servings < 1 or v_servings > 24 then v_errors := v_errors || '"invalid_servings"'::jsonb; end if;
  if jsonb_typeof(v_allergens) <> 'array' then v_allergens := '[]'::jsonb; end if;
  if jsonb_typeof(v_restrictions) <> 'array' then v_restrictions := '[]'::jsonb; end if;
  if jsonb_typeof(v_recipe_allergens) <> 'array' then v_recipe_allergens := '[]'::jsonb; end if;

  -- Canonical evidence layer. Only positive VERIFIED/HIGH conflicts reject.
  -- Missing/insufficient evidence is surfaced, never promoted to a safe claim.
  if jsonb_typeof(v_ingredients)='array' and jsonb_array_length(v_ingredients)>0 then
    v_catalogue := public.dgusteaux_analyze_ingredients(
      v_ingredients,
      jsonb_build_object('allergies',v_allergens,'restrictions',v_restrictions,'pantry','[]'::jsonb)
    );
    if coalesce((v_catalogue->>'ok')::boolean,false) then
      for v_finding in select value from jsonb_array_elements(coalesce(v_catalogue->'safetyFindings','[]'::jsonb))
      loop
        v_condition := translate(lower(trim(coalesce(v_finding->>'condition',v_finding->>'scope','unknown'))),'áéíóúüñ','aeiouun');
        if v_finding->>'status'='conflict' and v_finding->>'code'='allergen_conflict' then
          v_errors := v_errors || to_jsonb('allergen_conflict:'||v_condition);
        elsif v_finding->>'code'='insufficient_safety_evidence' then
          if not (v_warnings @> jsonb_build_array('insufficient_safety_evidence:'||v_condition)) then
            v_warnings := v_warnings || jsonb_build_array('insufficient_safety_evidence:'||v_condition);
          end if;
        end if;
      end loop;
    end if;
  end if;

  if jsonb_typeof(v_ingredients)='array' then
    for v_item in select value from jsonb_array_elements(v_ingredients)
    loop
      v_norm := case when jsonb_typeof(v_item)='object' then coalesce(v_item->>'name','') else trim(both '"' from v_item::text) end;
      v_norm := translate(lower(v_norm),'áéíóúüñ','aeiouun');
      v_ing_text := v_ing_text || ' ' || v_norm;
    end loop;
  end if;
  for v_item in select value from jsonb_array_elements(v_recipe_allergens)
  loop
    v_allergen_text := v_allergen_text || ' ' || translate(lower(trim(both '"' from v_item::text)),'áéíóúüñ','aeiouun');
  end loop;

  for v_item in select value from jsonb_array_elements(v_allergens)
  loop
    v_norm := translate(lower(trim(both '"' from v_item::text)),'áéíóúüñ','aeiouun');
    v_conflict := false;
    if v_norm <> '' and (v_ing_text like '%'||v_norm||'%' or v_allergen_text like '%'||v_norm||'%') then v_conflict := true; end if;
    if v_norm ~ '(cacahuete|peanut)' and v_ing_text ~ '(cacahuete|mani|peanut)' then v_conflict := true; end if;
    if v_norm ~ '(leche|lactosa|dairy)' and v_ing_text ~ '(leche|nata|mantequilla|queso|yogur|yogurt|cream|milk|butter|cheese)' then v_conflict := true; end if;
    if v_norm ~ '(huevo|egg)' and v_ing_text ~ '(huevo|egg)' then v_conflict := true; end if;
    if v_norm ~ '(gluten|trigo|wheat)' and v_ing_text ~ '(trigo|harina|pan|pasta|cuscus|wheat|flour|bread)' then v_conflict := true; end if;
    if v_norm ~ '(frutos secos|nueces|nuts?)' and v_ing_text ~ '(nuez|almendra|avellana|pistacho|anacardo|pecana|cashew|almond|hazelnut|walnut|pistachio)' then v_conflict := true; end if;
    if v_norm ~ '(soja|soy)' and v_ing_text ~ '(soja|soy|tofu|tempeh)' then v_conflict := true; end if;
    if v_norm ~ '(sesamo|sesame)' and v_ing_text ~ '(sesamo|tahini|sesame)' then v_conflict := true; end if;
    if v_norm ~ '(marisco|crustaceo|shellfish)' and v_ing_text ~ '(gamba|camaron|langostino|cangrejo|bogavante|langosta|shrimp|prawn|crab|lobster)' then v_conflict := true; end if;
    if v_conflict then v_errors := v_errors || to_jsonb('allergen_conflict:'||v_norm); end if;
  end loop;

  for v_item in select value from jsonb_array_elements(v_restrictions)
  loop
    v_norm := translate(lower(trim(both '"' from v_item::text)),'áéíóúüñ','aeiouun');
    if v_norm ~ '(vegano|vegan)' and v_ing_text ~ '(pollo|pavo|cerdo|jamon|ternera|res|carne|pescado|atun|salmon|marisco|huevo|leche|nata|mantequilla|queso|yogur|miel|chicken|turkey|pork|beef|fish|egg|milk|butter|cheese|honey)' then v_errors := v_errors || '"restriction_conflict:vegan"'::jsonb; end if;
    if v_norm ~ '(vegetariano|vegetarian)' and v_ing_text ~ '(pollo|pavo|cerdo|jamon|ternera|res|carne|pescado|atun|salmon|marisco|chicken|turkey|pork|beef|fish|shrimp|prawn)' then v_errors := v_errors || '"restriction_conflict:vegetarian"'::jsonb; end if;
    if v_norm ~ '(sin gluten|gluten.?free)' and v_ing_text ~ '(trigo|harina|pan|pasta|cuscus|wheat|flour|bread)' then v_errors := v_errors || '"restriction_conflict:gluten_free"'::jsonb; end if;
    if v_norm ~ '(sin lactosa|lactose.?free)' and v_ing_text ~ '(leche|nata|mantequilla|queso|yogur|milk|cream|butter|cheese|yogurt)' then v_errors := v_errors || '"restriction_conflict:lactose_free"'::jsonb; end if;
    if v_norm ~ '(sin alcohol|no alcohol|alcohol.?free)' and v_ing_text ~ '(vino|cerveza|ron|brandy|cognac|wine|beer|rum)' then v_errors := v_errors || '"restriction_conflict:alcohol_free"'::jsonb; end if;
  end loop;

  if jsonb_typeof(v_steps)='array' then
    for v_step in select value from jsonb_array_elements(v_steps)
    loop
      v_step_text := v_step_text || ' ' || translate(lower(coalesce(v_step->>'title','')||' '||coalesce(v_step->>'text','')),'áéíóúüñ','aeiouun');
      if translate(lower(coalesce(v_step->>'title','')||' '||coalesce(v_step->>'text','')),'áéíóúüñ','aeiouun') ~ '(nitrogeno liquido|hielo seco.*comer|sosa caustica|lejia|bleach|metanol|methanol|alcohol isopropil|isopropyl|flambear|flambe)' then
        v_errors := v_errors || '"unsupported_dangerous_operation"'::jsonb;
      end if;
      v_risk := translate(lower(coalesce(v_step->>'title','')||' '||coalesce(v_step->>'text','')),'áéíóúüñ','aeiouun') ~ '(cuchill|cort|pica|fuego|horno|sarten|freir|aceite caliente|herv|plancha|parrilla|gas|quem|calor|cocinar|cocina|coccion|calienta)';
      if v_risk then
        v_new_steps := v_new_steps || jsonb_build_array(v_step || jsonb_build_object('requiresAdultSupervision',true));
      else
        v_new_steps := v_new_steps || jsonb_build_array(v_step);
      end if;
    end loop;
  end if;

  if v_ing_text ~ '(pollo|chicken|pavo|turkey)' and v_step_text !~ '(completamente cocinad|bien cocid|sin partes crudas|74 ?°?c|74 ?c|165 ?°?f)' then
    v_errors := v_errors || '"incomplete_poultry_cooking_guidance"'::jsonb;
  end if;

  if jsonb_array_length(v_errors) > 0 then
    return jsonb_build_object('ok',false,'recipe',p_recipe,'warnings',v_warnings,'errors',v_errors);
  end if;
  return jsonb_build_object('ok',true,'recipe',jsonb_set(p_recipe,'{steps}',v_new_steps,true),'warnings',v_warnings,'errors',v_errors);
end;
$$;

revoke all on function public.dgusteaux_validate_recipe(jsonb,jsonb) from public,anon;
grant execute on function public.dgusteaux_validate_recipe(jsonb,jsonb) to authenticated,service_role;
