SELECT "nip", COUNT(*) AS cnt
FROM "Client"
GROUP BY "nip"
HAVING COUNT(*) > 1
ORDER BY cnt DESC, "nip";
