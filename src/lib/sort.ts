export type SortDir = "asc" | "desc";

export function compareBy<T>(get: (x: T) => string | number, dir: SortDir = "asc") {
    return (a: T, b: T) => {
        const av = get(a);
        const bv = get(b);
        const r = typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "pl");
        return dir === "asc" ? r : -r;
    };
}
