-- Applied as public_visit_bot_classification; existing rows and privileges preserved.
BEGIN;
ALTER TABLE public.toolbox_public_visit_events DROP CONSTRAINT toolbox_public_visit_events_category_check;
ALTER TABLE public.toolbox_public_visit_events ADD CONSTRAINT toolbox_public_visit_events_category_check CHECK(category IN ('likely_human','bot','automated','unknown'));
ALTER TABLE public.toolbox_public_visit_daily DROP CONSTRAINT toolbox_public_visit_daily_category_check;
ALTER TABLE public.toolbox_public_visit_daily ADD CONSTRAINT toolbox_public_visit_daily_category_check CHECK(category IN ('likely_human','bot','automated','unknown'));
CREATE OR REPLACE FUNCTION public.record_toolbox_public_visit(p_event_id uuid, p_site_id text, p_category text, p_is_visit boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE accepted integer;
BEGIN
 IF p_event_id IS NULL OR p_is_visit IS NULL OR p_category NOT IN ('likely_human','bot','automated','unknown') OR NOT EXISTS(SELECT 1 FROM public.toolbox_public_site_sources WHERE site_id=p_site_id) THEN RAISE EXCEPTION 'invalid_public_visit'; END IF;
 INSERT INTO public.toolbox_public_visit_events(event_id,site_id,visit_day,category,is_visit) VALUES(p_event_id,p_site_id,(now() AT TIME ZONE 'Asia/Seoul')::date,p_category,p_is_visit) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS accepted=ROW_COUNT;
 IF accepted=0 THEN RETURN false; END IF;
 INSERT INTO public.toolbox_public_visit_daily(site_id,visit_day,category,visits,pageviews) VALUES(p_site_id,(now() AT TIME ZONE 'Asia/Seoul')::date,p_category,CASE WHEN p_is_visit THEN 1 ELSE 0 END,1)
 ON CONFLICT(site_id,visit_day,category) DO UPDATE SET visits=public.toolbox_public_visit_daily.visits+EXCLUDED.visits,pageviews=public.toolbox_public_visit_daily.pageviews+1,updated_at=now();
 RETURN true;
END $function$
;
REVOKE ALL ON FUNCTION public.record_toolbox_public_visit(uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_toolbox_public_visit(uuid,text,text,boolean) TO service_role;
COMMIT;
