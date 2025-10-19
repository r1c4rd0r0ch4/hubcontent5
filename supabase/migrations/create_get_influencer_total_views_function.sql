/*
  # Create get_influencer_total_views function
  1. New Function: get_influencer_total_views(p_influencer_id uuid) returns bigint
  2. Description: Calculates the total views for all content posts of a given influencer.
*/
CREATE OR REPLACE FUNCTION public.get_influencer_total_views(p_influencer_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_views bigint;
BEGIN
  SELECT COALESCE(SUM(cv.count), 0)
  INTO total_views
  FROM content_posts cp
  LEFT JOIN (
    SELECT content_id, COUNT(*) as count
    FROM content_views
    GROUP BY content_id
  ) cv ON cp.id = cv.content_id
  WHERE cp.user_id = p_influencer_id;

  RETURN total_views;
END;
$function$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_influencer_total_views(uuid) TO authenticated, anon;