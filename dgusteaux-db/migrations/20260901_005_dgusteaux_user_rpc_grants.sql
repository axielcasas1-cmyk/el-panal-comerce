-- D'GUSTEAUX continuity fix: write privileges required by existing SECURITY INVOKER RPCs.
-- RLS remains the ownership boundary; anonymous access is not expanded.

grant insert, update on table dgusteaux.app_state to authenticated;
grant insert, update on table dgusteaux.recipes to authenticated;
grant insert, update on table dgusteaux.palate_profiles to authenticated;
grant insert on table dgusteaux.dish_feedback to authenticated;

revoke insert, update, delete on table dgusteaux.app_state from anon;
revoke insert, update, delete on table dgusteaux.recipes from anon;
revoke insert, update, delete on table dgusteaux.palate_profiles from anon;
revoke insert, update, delete on table dgusteaux.dish_feedback from anon;
