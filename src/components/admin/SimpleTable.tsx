type Col<T> = { key: keyof T; header: string };

export function SimpleTable<T extends Record<string, unknown>>({
  cols, rows, empty = "Brak danych", onRowClick,
}: {
  cols: Col<T>[];
  rows: T[];
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {cols.map((c) => (
              <th
                key={String(c.key)}
                className="px-3 py-2 text-left text-sm font-medium text-gray-700 border-b"
              >
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
              <tr key={i} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => onRowClick?.(r)}>
                {cols.map((c) => (
                  <td key={String(c.key)} className="px-3 py-2 text-sm text-gray-800 border-b">
                    {String((r as Record<string, unknown>)[c.key as string] ?? "—")}
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
