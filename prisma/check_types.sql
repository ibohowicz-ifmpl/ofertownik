SELECT
  c.table_name, c.column_name, c.data_type
FROM information_schema.columns c
WHERE (c.table_name, c.column_name) IN (
  ('MPK','id'),
  ('UserMPK','mpkId')
)
ORDER BY c.table_name, c.column_name;
