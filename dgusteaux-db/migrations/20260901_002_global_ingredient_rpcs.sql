-- GLOBAL INGREDIENT INTELLIGENCE v1
-- Task 2: authenticated SECURITY INVOKER RPC boundary.

create or replace function public.dgusteaux_search_ingredients(
  p_query text,
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, dgusteaux
as $$
declare
  v_query text := trim(coalesce(p_query,''));
  v_norm text;
  v_results jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_context is null or jsonb_typeof(p_context) <> 'object' then raise exception 'context_object_required' using errcode='22023'; end if;
  if length(v_query) > 120 then raise exception 'query_too_long' using errcode='22023'; end if;
  if v_query = '' then return jsonb_build_object('ok',true,'query',v_query,'results','[]'::jsonb); end if;
  v_norm := translate(lower(trim(v_query)),'áéíóúüñ','aeiouun');

  with candidates as (
    select i.id,i.canonical_name,i.category,
           'canonical'::text as matched_by,null::text as matched_alias,
           null::text as language,null::text as country,null::text as subdivision,
           coalesce(a_best.confidence::text,'UNVERIFIED') as confidence,
           case when translate(lower(trim(i.canonical_name)),'áéíóúüñ','aeiouun')=v_norm then 300
                when translate(lower(trim(i.canonical_name)),'áéíóúüñ','aeiouun') like v_norm||'%' then 220 else 120 end as match_score
    from dgusteaux.ingredients i
    left join lateral (
      select a.confidence from dgusteaux.ingredient_aliases a
      where a.ingredient_id=i.id
      order by case a.confidence when 'VERIFIED' then 5 when 'HIGH' then 4 when 'MEDIUM' then 3 when 'LOW' then 2 else 1 end desc
      limit 1
    ) a_best on true
    where i.active and translate(lower(trim(i.canonical_name)),'áéíóúüñ','aeiouun') like '%'||v_norm||'%'
    union all
    select i.id,i.canonical_name,i.category,
           'alias'::text,a.alias,a.language_code,a.country_code,a.subdivision_code,a.confidence::text,
           case when a.normalized_alias=v_norm then 280 when a.normalized_alias like v_norm||'%' then 210 else 110 end
    from dgusteaux.ingredient_aliases a
    join dgusteaux.ingredients i on i.id=a.ingredient_id and i.active
    where a.normalized_alias like '%'||v_norm||'%'
  ), ranked as (
    select distinct on(id) * from candidates
    order by id,match_score desc,
      case confidence when 'VERIFIED' then 5 when 'HIGH' then 4 when 'MEDIUM' then 3 when 'LOW' then 2 else 1 end desc
  ), limited as (
    select * from ranked order by match_score desc,canonical_name limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'canonicalName',canonical_name,'category',category,'matchedBy',matched_by,
    'matchedAlias',matched_alias,'language',language,'country',country,'subdivision',subdivision,'confidence',confidence
  )),'[]'::jsonb) into v_results from limited;

  return jsonb_build_object('ok',true,'query',v_query,'results',v_results);
end;
$$;

create or replace function public.dgusteaux_get_ingredient(
  p_ingredient_id uuid,
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, dgusteaux
as $$
declare
  v_i dgusteaux.ingredients%rowtype;
  v_aliases jsonb; v_sensory jsonb; v_functions jsonb; v_nutrition jsonb;
  v_allergens jsonb; v_seasonality jsonb; v_compatibility jsonb; v_sources jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_country text := upper(nullif(trim(coalesce(p_context->>'country','')),''));
  v_subdivision text := nullif(trim(coalesce(p_context->>'subdivision','')),'');
  v_month int;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_context is null or jsonb_typeof(p_context) <> 'object' then raise exception 'context_object_required' using errcode='22023'; end if;
  select * into v_i from dgusteaux.ingredients where id=p_ingredient_id and active;
  if not found then return jsonb_build_object('ok',false,'error','ingredient_not_resolved'); end if;
  begin v_month := nullif(p_context->>'month','')::int; exception when others then v_month := null; end;
  if v_month is not null and (v_month<1 or v_month>12) then v_month:=null; end if;

  select coalesce(jsonb_agg(jsonb_build_object('alias',alias,'language',language_code,'country',country_code,'subdivision',subdivision_code,'type',alias_type,'confidence',confidence::text,'sourceId',source_id) order by alias),'[]'::jsonb)
    into v_aliases from dgusteaux.ingredient_aliases where ingredient_id=p_ingredient_id;
  select coalesce((select jsonb_build_object(
      'sweet',sweet,'salty',salty,'acidic',acidic,'bitter',bitter,'umami',umami,'fatty',fatty,'spicy',spicy,
      'astringent',astringent,'aromaticIntensity',aromatic_intensity,'juicy',juicy,'crunchy',crunchy,'creamy',creamy,
      'persistence',persistence,'confidence',confidence::text,'sourceId',source_id,'reviewedAt',reviewed_at
    ) from dgusteaux.ingredient_sensory where ingredient_id=p_ingredient_id),'{}'::jsonb) into v_sensory;
  select coalesce(jsonb_agg(jsonb_build_object('function',function_key,'technique',technique_context,'dishContext',dish_context,'score',score,'confidence',confidence::text,'sourceId',source_id) order by score desc),'[]'::jsonb)
    into v_functions from dgusteaux.ingredient_functions where ingredient_id=p_ingredient_id;
  select coalesce(jsonb_agg(jsonb_build_object('nutrient',nutrient_key,'value',nutrient_value,'unit',unit,'basis',basis,'country',source_country_code,'confidence',confidence::text,'sourceId',source_id,'reviewedAt',reviewed_at) order by nutrient_key),'[]'::jsonb)
    into v_nutrition from dgusteaux.ingredient_nutrition where ingredient_id=p_ingredient_id;
  select coalesce(jsonb_agg(jsonb_build_object('allergen',allergen_key,'relation',relation::text,'confidence',confidence::text,'sourceId',source_id,'reviewedAt',reviewed_at) order by allergen_key),'[]'::jsonb)
    into v_allergens from dgusteaux.ingredient_allergens where ingredient_id=p_ingredient_id;

  if v_country is null then
    select coalesce(jsonb_agg(jsonb_build_object('country',country_code,'subdivision',subdivision_code,'month',month,'status',status::text,'context',context,'confidence',confidence::text,'sourceId',source_id) order by country_code,subdivision_code,month),'[]'::jsonb)
      into v_seasonality from dgusteaux.ingredient_seasonality where ingredient_id=p_ingredient_id;
  else
    with x as (
      select s.*, row_number() over(partition by s.month order by
        case when v_subdivision is not null and s.subdivision_code=v_subdivision then 2 when s.subdivision_code is null then 1 else 0 end desc,
        case s.confidence when 'VERIFIED' then 5 when 'HIGH' then 4 when 'MEDIUM' then 3 when 'LOW' then 2 else 1 end desc) rn
      from dgusteaux.ingredient_seasonality s
      where s.ingredient_id=p_ingredient_id and s.country_code=v_country
        and (v_subdivision is null and s.subdivision_code is null or v_subdivision is not null and (s.subdivision_code=v_subdivision or s.subdivision_code is null))
        and (v_month is null or s.month=v_month)
    )
    select coalesce(jsonb_agg(jsonb_build_object('country',country_code,'subdivision',subdivision_code,'month',month,'status',status::text,'context',context,'confidence',confidence::text,'sourceId',source_id) order by month),'[]'::jsonb)
      into v_seasonality from x where rn=1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'ingredientId',case when c.ingredient_a_id=p_ingredient_id then c.ingredient_b_id else c.ingredient_a_id end,
      'ingredientName',oi.canonical_name,'score',c.compatibility_score,'reason',c.reason_key,'technique',c.technique_context,
      'dishContext',c.dish_context,'explanation',c.explanation,'confidence',c.confidence::text,'sourceId',c.source_id
    ) order by c.compatibility_score desc),'[]'::jsonb)
    into v_compatibility
    from dgusteaux.ingredient_compatibility c
    join dgusteaux.ingredients oi on oi.id=case when c.ingredient_a_id=p_ingredient_id then c.ingredient_b_id else c.ingredient_a_id end
    where c.ingredient_a_id=p_ingredient_id or c.ingredient_b_id=p_ingredient_id;

  with source_ids as (
    select source_id from dgusteaux.ingredient_aliases where ingredient_id=p_ingredient_id and source_id is not null
    union select source_id from dgusteaux.ingredient_sensory where ingredient_id=p_ingredient_id and source_id is not null
    union select source_id from dgusteaux.ingredient_functions where ingredient_id=p_ingredient_id and source_id is not null
    union select source_id from dgusteaux.ingredient_allergens where ingredient_id=p_ingredient_id and source_id is not null
    union select source_id from dgusteaux.ingredient_nutrition where ingredient_id=p_ingredient_id
    union select source_id from dgusteaux.ingredient_seasonality where ingredient_id=p_ingredient_id
    union select source_id from dgusteaux.ingredient_compatibility where (ingredient_a_id=p_ingredient_id or ingredient_b_id=p_ingredient_id) and source_id is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'title',s.source_title,'organization',s.source_organization,'locator',s.source_locator,'class',s.source_class,'country',s.country_code,'subdivision',s.subdivision_code,'reviewedAt',s.reviewed_at,'confidence',s.confidence::text,'current',s.is_current) order by s.source_organization,s.source_title),'[]'::jsonb)
    into v_sources from dgusteaux.ingredient_sources s join source_ids x on x.source_id=s.id where s.is_current;

  if jsonb_array_length(v_nutrition)=0 then v_warnings:=v_warnings||jsonb_build_array('nutrition_not_verified'); end if;
  if jsonb_typeof(coalesce(p_context->'allergies','[]'::jsonb))='array' and jsonb_array_length(coalesce(p_context->'allergies','[]'::jsonb))>0 and jsonb_array_length(v_allergens)=0 then
    v_warnings:=v_warnings||jsonb_build_array('allergen_evidence_missing');
  end if;

  return jsonb_build_object(
    'ok',true,
    'ingredient',jsonb_build_object('id',v_i.id,'canonicalName',v_i.canonical_name,'scientificName',v_i.scientific_name,'category',v_i.category,'subcategory',v_i.subcategory,'defaultForm',v_i.default_form,'originRegion',v_i.origin_region,'active',v_i.active),
    'aliases',v_aliases,'sensory',v_sensory,'functions',v_functions,'nutrition',v_nutrition,'allergens',v_allergens,
    'seasonality',v_seasonality,'compatibility',v_compatibility,'sources',v_sources,'warnings',v_warnings
  );
end;
$$;

create or replace function public.dgusteaux_get_seasonal_ingredients(
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, dgusteaux
as $$
declare
  v_country text := upper(coalesce(nullif(trim(p_context->>'country'),''),'ES'));
  v_subdivision text := nullif(trim(coalesce(p_context->>'subdivision','')),'');
  v_month int;
  v_results jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_context is null or jsonb_typeof(p_context) <> 'object' then raise exception 'context_object_required' using errcode='22023'; end if;
  begin v_month:=coalesce(nullif(p_context->>'month','')::int,extract(month from current_date)::int); exception when others then v_month:=extract(month from current_date)::int; end;
  if v_month<1 or v_month>12 then raise exception 'invalid_month' using errcode='22023'; end if;

  with candidates as (
    select s.*,i.canonical_name,i.category,
      row_number() over(partition by s.ingredient_id order by
        case when v_subdivision is not null and s.subdivision_code=v_subdivision then 2 when s.subdivision_code is null then 1 else 0 end desc,
        case s.confidence when 'VERIFIED' then 5 when 'HIGH' then 4 when 'MEDIUM' then 3 when 'LOW' then 2 else 1 end desc) rn
    from dgusteaux.ingredient_seasonality s join dgusteaux.ingredients i on i.id=s.ingredient_id and i.active
    where s.country_code=v_country and s.month=v_month
      and (v_subdivision is null and s.subdivision_code is null or v_subdivision is not null and (s.subdivision_code=v_subdivision or s.subdivision_code is null))
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',ingredient_id,'canonicalName',canonical_name,'category',category,'country',country_code,'subdivision',subdivision_code,'month',month,'status',status::text,'confidence',confidence::text,'sourceId',source_id) order by canonical_name),'[]'::jsonb)
    into v_results from candidates where rn=1;

  if jsonb_array_length(v_results)=0 then return jsonb_build_object('ok',false,'error','region_not_covered','country',v_country,'subdivision',v_subdivision,'month',v_month,'ingredients','[]'::jsonb); end if;
  return jsonb_build_object('ok',true,'country',v_country,'subdivision',v_subdivision,'month',v_month,'ingredients',v_results,'warnings','[]'::jsonb);
end;
$$;

create or replace function public.dgusteaux_suggest_substitutes(
  p_ingredient_id uuid,
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, dgusteaux
as $$
declare
  v_allergies jsonb := coalesce(p_context->'allergies','[]'::jsonb);
  v_restrictions jsonb := coalesce(p_context->'restrictions','[]'::jsonb);
  v_results jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_context is null or jsonb_typeof(p_context) <> 'object' then raise exception 'context_object_required' using errcode='22023'; end if;
  if jsonb_typeof(v_allergies)<>'array' then v_allergies:='[]'::jsonb; end if;
  if jsonb_typeof(v_restrictions)<>'array' then v_restrictions:='[]'::jsonb; end if;
  if not exists(select 1 from dgusteaux.ingredients where id=p_ingredient_id and active) then return jsonb_build_object('ok',false,'error','ingredient_not_resolved'); end if;

  with base as (
    select s.*,i.canonical_name,i.category,src.source_title,src.source_organization,
      case
        when exists(
          select 1 from dgusteaux.ingredient_allergens a, jsonb_array_elements_text(v_allergies) al
          where a.ingredient_id=s.substitute_ingredient_id
            and translate(lower(trim(a.allergen_key)),'áéíóúüñ','aeiouun')=translate(lower(trim(al.value)),'áéíóúüñ','aeiouun')
            and a.confidence in ('VERIFIED','HIGH') and a.relation in ('CONTAINS','MAY_CONTAIN','CROSS_CONTACT_RISK')
        ) then 'unsafe'
        when jsonb_array_length(v_restrictions)>0 then 'insufficient_evidence'
        when jsonb_array_length(v_allergies)>0 then 'insufficient_evidence'
        else 'safe'
      end as safety_status,
      round((s.culinary_function_score*0.25+s.flavor_score*0.20+s.texture_score*0.15+s.nutrition_score*0.10+s.approximate_cost_score*0.10+s.availability_score*0.10+s.restriction_compatibility_score*0.10)::numeric,2) overall_score
    from dgusteaux.ingredient_substitutions s
    join dgusteaux.ingredients i on i.id=s.substitute_ingredient_id and i.active
    left join dgusteaux.ingredient_sources src on src.id=s.source_id
    where s.original_ingredient_id=p_ingredient_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',substitute_ingredient_id,'canonicalName',canonical_name,'category',category,'safetyStatus',safety_status,
    'overallScore',overall_score,'scores',jsonb_build_object('culinaryFunction',culinary_function_score,'flavor',flavor_score,'texture',texture_score,'nutrition',nutrition_score,'approximateCost',approximate_cost_score,'availability',availability_score,'restrictionCompatibility',restriction_compatibility_score),
    'technique',technique_context,'dishContext',dish_context,'explanation',explanation,'caveats',caveats,'confidence',confidence::text,
    'source',case when source_id is null then null else jsonb_build_object('id',source_id,'title',source_title,'organization',source_organization) end
  ) order by case safety_status when 'safe' then 1 when 'insufficient_evidence' then 2 else 3 end,overall_score desc),'[]'::jsonb)
  into v_results from base;

  return jsonb_build_object('ok',true,'ingredientId',p_ingredient_id,'substitutes',v_results,
    'warnings',case when jsonb_array_length(v_allergies)>0 or jsonb_array_length(v_restrictions)>0 then jsonb_build_array('safety_evidence_required') else '[]'::jsonb end);
end;
$$;

create or replace function public.dgusteaux_analyze_ingredients(
  p_ingredients jsonb,
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, dgusteaux
as $$
declare
  v_item jsonb; v_name text; v_norm text; v_ids uuid[]; v_id uuid; v_canonical text;
  v_resolved jsonb := '[]'::jsonb; v_unresolved jsonb := '[]'::jsonb; v_safety jsonb := '[]'::jsonb; v_functions jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_allergies jsonb := coalesce(p_context->'allergies','[]'::jsonb); v_restrictions jsonb := coalesce(p_context->'restrictions','[]'::jsonb); v_pantry jsonb := coalesce(p_context->'pantry','[]'::jsonb);
  v_allergy text; v_at_home int:=0; v_substitutable int:=0; v_missing int:=0; v_is_home boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_ingredients is null or jsonb_typeof(p_ingredients)<>'array' then raise exception 'ingredients_array_required' using errcode='22023'; end if;
  if p_context is null or jsonb_typeof(p_context)<>'object' then raise exception 'context_object_required' using errcode='22023'; end if;
  if jsonb_typeof(v_allergies)<>'array' then v_allergies:='[]'::jsonb; end if;
  if jsonb_typeof(v_restrictions)<>'array' then v_restrictions:='[]'::jsonb; end if;
  if jsonb_typeof(v_pantry)<>'array' then v_pantry:='[]'::jsonb; end if;

  for v_item in select value from jsonb_array_elements(p_ingredients)
  loop
    v_name := trim(case when jsonb_typeof(v_item)='object' then coalesce(v_item->>'name','') else trim(both '"' from v_item::text) end);
    if v_name='' then v_unresolved:=v_unresolved||jsonb_build_array(jsonb_build_object('input',v_name,'error','ingredient_not_resolved')); v_missing:=v_missing+1; continue; end if;
    v_norm:=translate(lower(v_name),'áéíóúüñ','aeiouun');
    select array_agg(distinct id) into v_ids from (
      select i.id from dgusteaux.ingredients i where i.active and translate(lower(trim(i.canonical_name)),'áéíóúüñ','aeiouun')=v_norm
      union all
      select i.id from dgusteaux.ingredient_aliases a join dgusteaux.ingredients i on i.id=a.ingredient_id and i.active where a.normalized_alias=v_norm
    ) q;
    if v_ids is null or cardinality(v_ids)=0 then
      v_unresolved:=v_unresolved||jsonb_build_array(jsonb_build_object('input',v_name,'error','ingredient_not_resolved')); v_missing:=v_missing+1; continue;
    elsif cardinality(v_ids)>1 then
      v_unresolved:=v_unresolved||jsonb_build_array(jsonb_build_object('input',v_name,'error','ambiguous_alias')); v_missing:=v_missing+1; continue;
    end if;
    v_id:=v_ids[1]; select canonical_name into v_canonical from dgusteaux.ingredients where id=v_id;
    v_resolved:=v_resolved||jsonb_build_array(jsonb_build_object('input',v_name,'id',v_id,'canonicalName',v_canonical));

    v_is_home:=exists(select 1 from jsonb_array_elements(v_pantry) p where translate(lower(trim(case when jsonb_typeof(p.value)='object' then coalesce(p.value->>'name','') else trim(both '"' from p.value::text) end)),'áéíóúüñ','aeiouun')=v_norm);
    if v_is_home then v_at_home:=v_at_home+1;
    elsif exists(select 1 from dgusteaux.ingredient_substitutions s where s.original_ingredient_id=v_id) then v_substitutable:=v_substitutable+1;
    else v_missing:=v_missing+1; end if;

    select v_functions || coalesce(jsonb_agg(jsonb_build_object('ingredientId',v_id,'canonicalName',v_canonical,'function',function_key,'score',score,'confidence',confidence::text)),'[]'::jsonb)
      into v_functions from dgusteaux.ingredient_functions where ingredient_id=v_id;

    for v_allergy in select value from jsonb_array_elements_text(v_allergies)
    loop
      if exists(select 1 from dgusteaux.ingredient_allergens a where a.ingredient_id=v_id and translate(lower(trim(a.allergen_key)),'áéíóúüñ','aeiouun')=translate(lower(trim(v_allergy)),'áéíóúüñ','aeiouun') and a.confidence in ('VERIFIED','HIGH') and a.relation in ('CONTAINS','MAY_CONTAIN','CROSS_CONTACT_RISK')) then
        v_safety:=v_safety||jsonb_build_array(jsonb_build_object('ingredientId',v_id,'canonicalName',v_canonical,'condition',v_allergy,'status','conflict','code','allergen_conflict'));
      else
        v_safety:=v_safety||jsonb_build_array(jsonb_build_object('ingredientId',v_id,'canonicalName',v_canonical,'condition',v_allergy,'status','unknown','code','insufficient_safety_evidence'));
        if not (v_warnings @> '["insufficient_safety_evidence"]'::jsonb) then v_warnings:=v_warnings||jsonb_build_array('insufficient_safety_evidence'); end if;
      end if;
    end loop;
    if jsonb_array_length(v_restrictions)>0 then
      v_safety:=v_safety||jsonb_build_array(jsonb_build_object('ingredientId',v_id,'canonicalName',v_canonical,'status','unknown','code','insufficient_safety_evidence','scope','restriction'));
      if not (v_warnings @> '["insufficient_safety_evidence"]'::jsonb) then v_warnings:=v_warnings||jsonb_build_array('insufficient_safety_evidence'); end if;
    end if;
  end loop;

  return jsonb_build_object('ok',true,'resolved',v_resolved,'unresolved',v_unresolved,'safetyFindings',v_safety,'functions',v_functions,
    'pantrySummary',jsonb_build_object('atHome',v_at_home,'substitutable',v_substitutable,'missing',v_missing),'warnings',v_warnings);
end;
$$;

revoke all on function public.dgusteaux_search_ingredients(text,jsonb) from public,anon;
revoke all on function public.dgusteaux_get_ingredient(uuid,jsonb) from public,anon;
revoke all on function public.dgusteaux_get_seasonal_ingredients(jsonb) from public,anon;
revoke all on function public.dgusteaux_suggest_substitutes(uuid,jsonb) from public,anon;
revoke all on function public.dgusteaux_analyze_ingredients(jsonb,jsonb) from public,anon;

grant execute on function public.dgusteaux_search_ingredients(text,jsonb) to authenticated,service_role;
grant execute on function public.dgusteaux_get_ingredient(uuid,jsonb) to authenticated,service_role;
grant execute on function public.dgusteaux_get_seasonal_ingredients(jsonb) to authenticated,service_role;
grant execute on function public.dgusteaux_suggest_substitutes(uuid,jsonb) to authenticated,service_role;
grant execute on function public.dgusteaux_analyze_ingredients(jsonb,jsonb) to authenticated,service_role;
