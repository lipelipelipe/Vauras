BEGIN;

-- Remove duplicados mantendo 1 por (locale, href)
DELETE FROM "MenuItem" m
USING (
SELECT "locale", "href", MIN("id") AS keep_id
FROM "MenuItem"
GROUP BY "locale", "href"
HAVING COUNT(*) > 1
) d
WHERE m."locale" = d."locale"
AND m."href" = d."href"
AND m."id" <> d.keep_id;

COMMIT;