# Supabase project structure (deployed)

Project: `my-daily-life` (`ap-northeast-2`). **Already created; do not apply older v2 schema on this project.**

| Table | Data | Row-level security |
|---|---|---|
| user_preferences | Account options, holidays, process plan | auth.uid() = user_id |
| routine_items | Per-user editable task definition & schedule days | auth.uid() = user_id |
| daily_checkins | Daily completion per task | auth.uid() = user_id, item owner enforced |
| work_days | Work status overrides, Saturday, notes | auth.uid() = user_id |
| expenses | Date, amount, merchant, category | auth.uid() = user_id |
| monthly_budgets | Budget per calendar month | auth.uid() = user_id |

The deployed schema is managed by migrations `initial_multiuser_daily_app_schema` and `user_editable_routines_and_schedule_overrides` in Supabase. Security advisors reported 0 lints during development (not a substitute for a full security audit).

Never expose the service role or secret API key in the frontend. Public publishable API keys are safe for the client **only with RLS enabled and correct policies**.
