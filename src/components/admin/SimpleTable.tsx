type KeyOf<T> = Extract<keyof T, string>;
type Col<T> = { key: KeyOf<T>; header: string };

export function defineCols<T>() {
  return <U extends readonly Col<T>[]>(u: U) => u;
}

export function SimpleTable<T extends Record<string, unknown>>({
  cols,
  rows,
  empty = "Brak danych",
  onRowClick,
}: {
  cols: readonly Col<T>[];
  rows: readonly T[];
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left text-sm font-medium text-gray-700 border-b">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-3 py-6 text-center text-gray-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 cursor-pointer"
                onClick={() => onRowClick?.(r)}
              >
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-sm text-gray-800 border-b">
                    {String(r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
