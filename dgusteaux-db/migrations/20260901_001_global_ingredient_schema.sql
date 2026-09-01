-- GLOBAL INGREDIENT INTELLIGENCE v1
-- Task 1: normalized schema, quality constraints, RLS and append-only audit.

create schema if not exists dgusteaux;

do $$ begin
  create type dgusteaux.ingredient_confidence as enum ('VERIFIED','HIGH','MEDIUM','LOW','UNVERIFIED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dgusteaux.ingredient_allergen_relation as enum ('CONTAINS','MAY_CONTAIN','CROSS_CONTACT_RISK','UNKNOWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dgusteaux.ingredient_season_status as enum ('peak','in_season','shoulder','limited','unavailable','unknown');
exception when duplicate_object then null; end $$;

create table dgusteaux.ingredient_sources (
  id uuid primary key default gen_random_uuid(),
  source_title text not null check (length(trim(source_title)) between 1 and 300),
  source_organization text not null check (length(trim(source_organization)) between 1 and 300),
  source_locator text,
  source_class text not null check (source_class in ('official','scientific','technical','dop_igp','sector','producer','commercial')),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  subdivision_code text,
  accessed_at date,
  reviewed_at date,
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  is_current boolean not null default true,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ingredient_sources_identity_uq
  on dgusteaux.ingredient_sources (
    lower(source_title), lower(source_organization), coalesce(source_locator,'')
  );

create table dgusteaux.ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null check (length(trim(canonical_name)) between 1 and 180),
  scientific_name text,
  category text not null check (length(trim(category)) between 1 and 80),
  subcategory text,
  default_form text,
  origin_region text,
  active boolean not null default true,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ingredients_identity_uq
  on dgusteaux.ingredients (lower(canonical_name), coalesce(lower(default_form),''));
create index ingredients_name_idx on dgusteaux.ingredients (lower(canonical_name));
create index ingredients_category_idx on dgusteaux.ingredients (category) where active;

create table dgusteaux.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  alias text not null check (length(trim(alias)) between 1 and 180),
  language_code text not null check (language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  subdivision_code text,
  alias_type text not null check (alias_type in ('common','regional','scientific','commercial')),
  normalized_alias text not null check (length(trim(normalized_alias)) between 1 and 180),
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ingredient_aliases_context_uq
  on dgusteaux.ingredient_aliases (
    normalized_alias, language_code, coalesce(country_code,''), coalesce(subdivision_code,'')
  );
create index ingredient_aliases_search_idx on dgusteaux.ingredient_aliases (normalized_alias);
create index ingredient_aliases_ingredient_idx on dgusteaux.ingredient_aliases (ingredient_id);

create table dgusteaux.ingredient_sensory (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null unique references dgusteaux.ingredients(id) on delete cascade,
  sweet numeric(3,2) check (sweet between 0 and 5),
  salty numeric(3,2) check (salty between 0 and 5),
  acidic numeric(3,2) check (acidic between 0 and 5),
  bitter numeric(3,2) check (bitter between 0 and 5),
  umami numeric(3,2) check (umami between 0 and 5),
  fatty numeric(3,2) check (fatty between 0 and 5),
  spicy numeric(3,2) check (spicy between 0 and 5),
  astringent numeric(3,2) check (astringent between 0 and 5),
  aromatic_intensity numeric(3,2) check (aromatic_intensity between 0 and 5),
  juicy numeric(3,2) check (juicy between 0 and 5),
  crunchy numeric(3,2) check (crunchy between 0 and 5),
  creamy numeric(3,2) check (creamy between 0 and 5),
  persistence numeric(3,2) check (persistence between 0 and 5),
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dgusteaux.ingredient_functions (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  function_key text not null check (function_key in ('structure','binder','thickener','fat','moisture','acidity','sweetness','umami','aroma','leavening','emulsification','browning','garnish')),
  technique_context text,
  dish_context text,
  score numeric(5,2) not null default 50 check (score between 0 and 100),
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ingredient_functions_context_uq
  on dgusteaux.ingredient_functions (
    ingredient_id, function_key, coalesce(lower(technique_context),''), coalesce(lower(dish_context),'')
  );

create table dgusteaux.ingredient_allergens (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  allergen_key text not null check (length(trim(allergen_key)) between 1 and 100),
  relation dgusteaux.ingredient_allergen_relation not null,
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  valid_from date,
  valid_to date,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index ingredient_allergens_fact_uq
  on dgusteaux.ingredient_allergens (ingredient_id, lower(allergen_key), relation, coalesce(source_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index ingredient_allergens_lookup_idx on dgusteaux.ingredient_allergens (ingredient_id, lower(allergen_key));

create table dgusteaux.ingredient_nutrition (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  nutrient_key text not null check (length(trim(nutrient_key)) between 1 and 100),
  nutrient_value numeric(14,5) not null check (nutrient_value >= 0),
  unit text not null check (length(trim(unit)) between 1 and 20),
  basis text not null check (basis in ('100g','100ml')),
  source_id uuid not null references dgusteaux.ingredient_sources(id) on delete restrict,
  source_country_code text check (source_country_code is null or source_country_code ~ '^[A-Z]{2}$'),
  valid_from date,
  valid_to date,
  reviewed_at date,
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index ingredient_nutrition_fact_uq
  on dgusteaux.ingredient_nutrition (ingredient_id, lower(nutrient_key), basis, source_id);

create table dgusteaux.ingredient_seasonality (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  subdivision_code text,
  month smallint not null check (month between 1 and 12),
  status dgusteaux.ingredient_season_status not null default 'unknown',
  context text,
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid not null references dgusteaux.ingredient_sources(id) on delete restrict,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ingredient_seasonality_context_uq
  on dgusteaux.ingredient_seasonality (
    ingredient_id, country_code, coalesce(subdivision_code,''), month, source_id
  );
create index ingredient_seasonality_lookup_idx
  on dgusteaux.ingredient_seasonality (country_code, subdivision_code, month, status);

create table dgusteaux.ingredient_substitutions (
  id uuid primary key default gen_random_uuid(),
  original_ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  substitute_ingredient_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  culinary_function_score numeric(5,2) not null check (culinary_function_score between 0 and 100),
  flavor_score numeric(5,2) not null check (flavor_score between 0 and 100),
  texture_score numeric(5,2) not null check (texture_score between 0 and 100),
  nutrition_score numeric(5,2) not null check (nutrition_score between 0 and 100),
  approximate_cost_score numeric(5,2) not null check (approximate_cost_score between 0 and 100),
  availability_score numeric(5,2) not null check (availability_score between 0 and 100),
  restriction_compatibility_score numeric(5,2) not null check (restriction_compatibility_score between 0 and 100),
  technique_context text,
  dish_context text,
  explanation text not null check (length(trim(explanation)) between 1 and 1000),
  caveats text,
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (original_ingredient_id <> substitute_ingredient_id)
);

create unique index ingredient_substitutions_context_uq
  on dgusteaux.ingredient_substitutions (
    original_ingredient_id, substitute_ingredient_id,
    coalesce(lower(technique_context),''), coalesce(lower(dish_context),'')
  );
create index ingredient_substitutions_original_idx on dgusteaux.ingredient_substitutions (original_ingredient_id);

create table dgusteaux.ingredient_compatibility (
  id uuid primary key default gen_random_uuid(),
  ingredient_a_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  ingredient_b_id uuid not null references dgusteaux.ingredients(id) on delete cascade,
  compatibility_score numeric(5,2) not null check (compatibility_score between 0 and 100),
  reason_key text not null check (reason_key in ('aromatic_affinity','acid_fat_balance','umami_reinforcement','sweet_salty_contrast','texture_contrast','traditional_pairing','technique_specific')),
  technique_context text,
  dish_context text,
  explanation text,
  confidence dgusteaux.ingredient_confidence not null default 'UNVERIFIED',
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ingredient_a_id < ingredient_b_id)
);

create unique index ingredient_compatibility_pair_uq
  on dgusteaux.ingredient_compatibility (
    ingredient_a_id, ingredient_b_id, reason_key,
    coalesce(lower(technique_context),''), coalesce(lower(dish_context),'')
  );

create table dgusteaux.ingredient_change_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  previous_value jsonb,
  new_value jsonb,
  source_id uuid references dgusteaux.ingredient_sources(id) on delete set null,
  revision bigint not null default 1 check (revision > 0),
  changed_at timestamptz not null default now()
);
create index ingredient_change_log_entity_idx on dgusteaux.ingredient_change_log (entity_type, entity_id, changed_at desc);

create or replace function dgusteaux.log_ingredient_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, dgusteaux
as $$
declare
  v_new jsonb := case when tg_op='DELETE' then null else to_jsonb(new) end;
  v_old jsonb := case when tg_op='INSERT' then null else to_jsonb(old) end;
  v_row jsonb := coalesce(v_new,v_old,'{}'::jsonb);
  v_entity_id uuid;
  v_source_id uuid;
  v_revision bigint := 1;
begin
  v_entity_id := nullif(v_row->>'id','')::uuid;
  v_source_id := nullif(v_row->>'source_id','')::uuid;
  if coalesce(v_row->>'revision','') ~ '^[0-9]+$' then
    v_revision := greatest(1,(v_row->>'revision')::bigint);
  end if;
  insert into dgusteaux.ingredient_change_log(entity_type,entity_id,operation,previous_value,new_value,source_id,revision)
  values (tg_table_name,v_entity_id,tg_op,v_old,v_new,v_source_id,v_revision);
  return coalesce(new,old);
end;
$$;

create or replace function dgusteaux.prevent_ingredient_log_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'ingredient_change_log_is_append_only' using errcode='55000';
end;
$$;

create trigger ingredient_change_log_no_update
before update or delete on dgusteaux.ingredient_change_log
for each row execute function dgusteaux.prevent_ingredient_log_mutation();

create trigger ingredient_sources_audit after insert or update or delete on dgusteaux.ingredient_sources for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredients_audit after insert or update or delete on dgusteaux.ingredients for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_aliases_audit after insert or update or delete on dgusteaux.ingredient_aliases for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_sensory_audit after insert or update or delete on dgusteaux.ingredient_sensory for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_functions_audit after insert or update or delete on dgusteaux.ingredient_functions for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_allergens_audit after insert or update or delete on dgusteaux.ingredient_allergens for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_nutrition_audit after insert or update or delete on dgusteaux.ingredient_nutrition for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_seasonality_audit after insert or update or delete on dgusteaux.ingredient_seasonality for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_substitutions_audit after insert or update or delete on dgusteaux.ingredient_substitutions for each row execute function dgusteaux.log_ingredient_change();
create trigger ingredient_compatibility_audit after insert or update or delete on dgusteaux.ingredient_compatibility for each row execute function dgusteaux.log_ingredient_change();

alter table dgusteaux.ingredient_sources enable row level security;
alter table dgusteaux.ingredients enable row level security;
alter table dgusteaux.ingredient_aliases enable row level security;
alter table dgusteaux.ingredient_sensory enable row level security;
alter table dgusteaux.ingredient_functions enable row level security;
alter table dgusteaux.ingredient_allergens enable row level security;
alter table dgusteaux.ingredient_nutrition enable row level security;
alter table dgusteaux.ingredient_seasonality enable row level security;
alter table dgusteaux.ingredient_substitutions enable row level security;
alter table dgusteaux.ingredient_compatibility enable row level security;
alter table dgusteaux.ingredient_change_log enable row level security;

-- Catalogue data is read-only to ordinary authenticated users. Curation stays server-side.
create policy ingredient_sources_read_auth on dgusteaux.ingredient_sources for select to authenticated using (true);
create policy ingredients_read_auth on dgusteaux.ingredients for select to authenticated using (true);
create policy ingredient_aliases_read_auth on dgusteaux.ingredient_aliases for select to authenticated using (true);
create policy ingredient_sensory_read_auth on dgusteaux.ingredient_sensory for select to authenticated using (true);
create policy ingredient_functions_read_auth on dgusteaux.ingredient_functions for select to authenticated using (true);
create policy ingredient_allergens_read_auth on dgusteaux.ingredient_allergens for select to authenticated using (true);
create policy ingredient_nutrition_read_auth on dgusteaux.ingredient_nutrition for select to authenticated using (true);
create policy ingredient_seasonality_read_auth on dgusteaux.ingredient_seasonality for select to authenticated using (true);
create policy ingredient_substitutions_read_auth on dgusteaux.ingredient_substitutions for select to authenticated using (true);
create policy ingredient_compatibility_read_auth on dgusteaux.ingredient_compatibility for select to authenticated using (true);
-- Audit history is not client-readable in v1; it is available to service/admin tooling only.

revoke all on all tables in schema dgusteaux from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema dgusteaux from authenticated;
grant usage on schema dgusteaux to authenticated, service_role;
grant select on dgusteaux.ingredient_sources, dgusteaux.ingredients, dgusteaux.ingredient_aliases,
  dgusteaux.ingredient_sensory, dgusteaux.ingredient_functions, dgusteaux.ingredient_allergens,
  dgusteaux.ingredient_nutrition, dgusteaux.ingredient_seasonality, dgusteaux.ingredient_substitutions,
  dgusteaux.ingredient_compatibility to authenticated, service_role;
grant select on dgusteaux.ingredient_change_log to service_role;
grant usage, select on sequence dgusteaux.ingredient_change_log_id_seq to service_role;

revoke execute on function dgusteaux.log_ingredient_change() from public, anon, authenticated;
revoke execute on function dgusteaux.prevent_ingredient_log_mutation() from public, anon, authenticated;
