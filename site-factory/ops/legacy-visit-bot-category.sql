BEGIN;
ALTER TABLE public.toolbox_traffic_classified DROP CONSTRAINT toolbox_traffic_classified_category_check;
ALTER TABLE public.toolbox_traffic_classified ADD CONSTRAINT toolbox_traffic_classified_category_check CHECK(category IN ('likely_human','bot','automated','unknown'));
CREATE OR REPLACE FUNCTION public.record_toolbox_traffic_classified(p_event_id uuid,p_site_id text,p_category text,p_is_visit boolean) RETURNS boolean LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE did_insert int;
BEGIN
 IF p_site_id IS NULL OR length(p_site_id)>100 OR p_category NOT IN ('likely_human','bot','automated','unknown') THEN RAISE EXCEPTION 'invalid event'; END IF;
 INSERT INTO public.toolbox_traffic_classified(event_id,site_id,visit_day,category,is_visit) VALUES(p_event_id,p_site_id,(now() AT TIME ZONE 'Asia/Seoul')::date,p_category,p_is_visit) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS did_insert=ROW_COUNT;
 RETURN did_insert>0;
END $function$;
COMMIT;
