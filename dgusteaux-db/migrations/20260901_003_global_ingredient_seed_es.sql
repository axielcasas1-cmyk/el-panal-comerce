-- GLOBAL INGREDIENT INTELLIGENCE v1
-- Task 3: reviewed ES-1 foundation dataset.
-- Stable UUIDs are derived from deterministic text keys with md5(... )::uuid.

with rows(key,source_title,source_organization,source_locator,source_class,country_code,confidence) as (values
 ('aesan_bedca_context','BEDCA - Base de datos española de composición de alimentos','Agencia Española de Seguridad Alimentaria y Nutrición (AESAN)','https://aesan.gob.es/va/ambito-cientifico/evaluacion-de-riesgos/procedimientos/datos-evaluacion','official','ES','HIGH'::dgusteaux.ingredient_confidence),
 ('eu_1169_annex_ii','Reglamento (UE) n.º 1169/2011, Anexo II','EUR-Lex / Unión Europea','https://eur-lex.europa.eu/legal-content/ES/ALL/?uri=celex:32011R1169','official',null,'VERIFIED'::dgusteaux.ingredient_confidence),
 ('aesan_1169_consolidated','Reglamento 1169/2011 consolidado - información alimentaria','Agencia Española de Seguridad Alimentaria y Nutrición (AESAN)','https://www.aesan.gob.es/AECOSAN/docs/documentos/seguridad_alimentaria/gestion_riesgos/R1169-2011_consolidado.pdf','official','ES','HIGH'::dgusteaux.ingredient_confidence),
 ('mapa_hortalizas_temporada','Hortalizas de Temporada','Ministerio de Agricultura, Pesca y Alimentación (MAPA)','https://www.mapa.gob.es/es/alimentacion/temas/desperdicio/11calendario_verduras_completo_tcm30-623767.pdf','official','ES','HIGH'::dgusteaux.ingredient_confidence),
 ('aesan_cc32_nutrition','Revista del Comité Científico de la AESAN n.º 32','Agencia Española de Seguridad Alimentaria y Nutrición (AESAN)','https://www.aesan.gob.es/AECOSAN/docs/documentos/publicaciones/revistas_comite_cientifico/comite_cientifico_32.pdf','scientific','ES','HIGH'::dgusteaux.ingredient_confidence),
 ('dgusteaux_culinary_review_v1','D’GUSTEAUX Culinary Review v1','D’GUSTEAUX','internal://dgusteaux/culinary-review/v1','technical','ES','MEDIUM'::dgusteaux.ingredient_confidence)
)
insert into dgusteaux.ingredient_sources(id,source_title,source_organization,source_locator,source_class,country_code,accessed_at,reviewed_at,confidence,is_current,revision)
select md5('dgusteaux:source:'||key)::uuid,source_title,source_organization,source_locator,source_class,country_code,date '2026-09-01',date '2026-09-01',confidence,true,1 from rows
on conflict(id) do update set source_title=excluded.source_title,source_organization=excluded.source_organization,source_locator=excluded.source_locator,source_class=excluded.source_class,country_code=excluded.country_code,accessed_at=excluded.accessed_at,reviewed_at=excluded.reviewed_at,confidence=excluded.confidence,is_current=true,updated_at=now();

with rows(key,canonical_name,category,subcategory,default_form) as (values
 ('tomate','tomate','vegetal','hortaliza','fresco'),
 ('cebolla','cebolla','vegetal','hortaliza','fresca'),
 ('ajo','ajo','vegetal','hortaliza','fresco'),
 ('arroz','arroz','cereal',null,'seco'),
 ('pollo','pollo','carne','ave','crudo'),
 ('limon','limón','fruta','cítrico','fresco'),
 ('garbanzo','garbanzo','legumbre',null,'seco'),
 ('leche','leche','lácteo',null,'líquida'),
 ('huevo','huevo','huevo',null,'fresco'),
 ('cacahuete','cacahuete','legumbre','semilla oleaginosa','seco'),
 ('trigo','trigo','cereal',null,'grano'),
 ('almendra','almendra','fruto de cáscara',null,'seca'),
 ('aceite_oliva','aceite de oliva','grasa','aceite vegetal','líquido'),
 ('pimiento','pimiento','vegetal','hortaliza','fresco'),
 ('manzana','manzana','fruta',null,'fresca'),
 ('naranja','naranja','fruta','cítrico','fresca')
)
insert into dgusteaux.ingredients(id,canonical_name,category,subcategory,default_form,active,revision)
select md5('dgusteaux:ingredient:'||key)::uuid,canonical_name,category,subcategory,default_form,true,1 from rows
on conflict(id) do update set canonical_name=excluded.canonical_name,category=excluded.category,subcategory=excluded.subcategory,default_form=excluded.default_form,active=true,updated_at=now();

with rows(ingredient_key,alias,language_code,country_code,alias_type,confidence,source_key) as (values
 ('tomate','tomato','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('cebolla','onion','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('ajo','garlic','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('arroz','rice','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('pollo','chicken','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('limon','lemon','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('garbanzo','chickpea','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('leche','milk','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('huevo','egg','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('cacahuete','peanut','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('cacahuete','cacahuate','es','MX','regional','MEDIUM','dgusteaux_culinary_review_v1'),
 ('trigo','wheat','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('almendra','almond','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('aceite_oliva','olive oil','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('pimiento','bell pepper','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('manzana','apple','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1'),
 ('naranja','orange','en',null,'common','MEDIUM','dgusteaux_culinary_review_v1')
)
insert into dgusteaux.ingredient_aliases(id,ingredient_id,alias,language_code,country_code,alias_type,normalized_alias,confidence,source_id)
select md5('dgusteaux:alias:'||ingredient_key||':'||language_code||':'||coalesce(country_code,'')||':'||alias)::uuid,
       md5('dgusteaux:ingredient:'||ingredient_key)::uuid,alias,language_code,country_code,alias_type,
       translate(lower(trim(alias)),'áéíóúüñ','aeiouun'),confidence::dgusteaux.ingredient_confidence,
       md5('dgusteaux:source:'||source_key)::uuid
from rows
on conflict(id) do update set alias=excluded.alias,normalized_alias=excluded.normalized_alias,confidence=excluded.confidence,source_id=excluded.source_id,updated_at=now();

with rows(ingredient_key,allergen_key,relation,confidence,source_key) as (values
 ('leche','milk','CONTAINS','VERIFIED','eu_1169_annex_ii'),
 ('huevo','egg','CONTAINS','VERIFIED','eu_1169_annex_ii'),
 ('cacahuete','peanut','CONTAINS','VERIFIED','eu_1169_annex_ii'),
 ('trigo','gluten','CONTAINS','VERIFIED','eu_1169_annex_ii'),
 ('almendra','nuts','CONTAINS','VERIFIED','eu_1169_annex_ii')
)
insert into dgusteaux.ingredient_allergens(id,ingredient_id,allergen_key,relation,confidence,source_id,reviewed_at)
select md5('dgusteaux:allergen:'||ingredient_key||':'||allergen_key)::uuid,
       md5('dgusteaux:ingredient:'||ingredient_key)::uuid,allergen_key,relation::dgusteaux.ingredient_allergen_relation,
       confidence::dgusteaux.ingredient_confidence,md5('dgusteaux:source:'||source_key)::uuid,date '2026-09-01'
from rows
on conflict(id) do update set relation=excluded.relation,confidence=excluded.confidence,source_id=excluded.source_id,reviewed_at=excluded.reviewed_at,updated_at=now();

insert into dgusteaux.ingredient_nutrition(id,ingredient_id,nutrient_key,nutrient_value,unit,basis,source_id,source_country_code,reviewed_at,confidence)
values(md5('dgusteaux:nutrition:aceite_oliva:fat:100g')::uuid,md5('dgusteaux:ingredient:aceite_oliva')::uuid,'fat',99,'g','100g',md5('dgusteaux:source:aesan_cc32_nutrition')::uuid,'ES',date '2026-09-01','HIGH')
on conflict(id) do update set nutrient_value=excluded.nutrient_value,unit=excluded.unit,basis=excluded.basis,source_id=excluded.source_id,source_country_code=excluded.source_country_code,reviewed_at=excluded.reviewed_at,confidence=excluded.confidence,updated_at=now();

insert into dgusteaux.ingredient_seasonality(id,ingredient_id,country_code,month,status,context,confidence,source_id,reviewed_at)
select md5('dgusteaux:season:tomate:ES:'||m)::uuid,md5('dgusteaux:ingredient:tomate')::uuid,'ES',m,'in_season','Calendario nacional de hortalizas de temporada','HIGH',md5('dgusteaux:source:mapa_hortalizas_temporada')::uuid,date '2026-09-01'
from generate_series(1,12) m
on conflict(id) do update set status=excluded.status,context=excluded.context,confidence=excluded.confidence,source_id=excluded.source_id,reviewed_at=excluded.reviewed_at,updated_at=now();

with rows(ingredient_key,function_key,score,source_key) as (values
 ('limon','acidity',95,'dgusteaux_culinary_review_v1'),
 ('naranja','acidity',72,'dgusteaux_culinary_review_v1'),
 ('ajo','aroma',95,'dgusteaux_culinary_review_v1'),
 ('cebolla','aroma',88,'dgusteaux_culinary_review_v1'),
 ('pollo','structure',85,'dgusteaux_culinary_review_v1'),
 ('garbanzo','structure',80,'dgusteaux_culinary_review_v1')
)
insert into dgusteaux.ingredient_functions(id,ingredient_id,function_key,score,confidence,source_id)
select md5('dgusteaux:function:'||ingredient_key||':'||function_key)::uuid,md5('dgusteaux:ingredient:'||ingredient_key)::uuid,function_key,score,'MEDIUM',md5('dgusteaux:source:'||source_key)::uuid from rows
on conflict(id) do update set score=excluded.score,confidence=excluded.confidence,source_id=excluded.source_id,updated_at=now();

with rows(original_key,substitute_key,culinary_function_score,flavor_score,texture_score,nutrition_score,approximate_cost_score,availability_score,restriction_compatibility_score,technique_context,dish_context,explanation,caveats) as (values
 ('limon','naranja',78,72,65,75,80,90,90,'acabado y salsas',null,'Puede aportar acidez cítrica y aroma cuando se acepta un perfil algo más dulce.','Es menos ácido y más dulce; no sustituye al limón en todas las técnicas.'),
 ('ajo','cebolla',70,55,70,70,90,95,90,'sofrito',null,'Puede mantener una base aromática de sofrito cuando el ajo falta.','No reproduce el aroma sulfurado ni la intensidad del ajo.'),
 ('pollo','garbanzo',68,45,65,70,85,85,65,null,'guisos','En ciertos guisos puede asumir parte de la estructura del componente principal.','No es un equivalente sensorial ni nutricional completo del pollo.')
)
insert into dgusteaux.ingredient_substitutions(id,original_ingredient_id,substitute_ingredient_id,culinary_function_score,flavor_score,texture_score,nutrition_score,approximate_cost_score,availability_score,restriction_compatibility_score,technique_context,dish_context,explanation,caveats,confidence,source_id,reviewed_at)
select md5('dgusteaux:substitution:'||original_key||':'||substitute_key||':'||coalesce(technique_context,'')||':'||coalesce(dish_context,''))::uuid,
       md5('dgusteaux:ingredient:'||original_key)::uuid,md5('dgusteaux:ingredient:'||substitute_key)::uuid,
       culinary_function_score,flavor_score,texture_score,nutrition_score,approximate_cost_score,availability_score,restriction_compatibility_score,
       technique_context,dish_context,explanation,caveats,'MEDIUM',md5('dgusteaux:source:dgusteaux_culinary_review_v1')::uuid,date '2026-09-01'
from rows
on conflict(id) do update set culinary_function_score=excluded.culinary_function_score,flavor_score=excluded.flavor_score,texture_score=excluded.texture_score,nutrition_score=excluded.nutrition_score,approximate_cost_score=excluded.approximate_cost_score,availability_score=excluded.availability_score,restriction_compatibility_score=excluded.restriction_compatibility_score,technique_context=excluded.technique_context,dish_context=excluded.dish_context,explanation=excluded.explanation,caveats=excluded.caveats,confidence=excluded.confidence,source_id=excluded.source_id,reviewed_at=excluded.reviewed_at,updated_at=now();
