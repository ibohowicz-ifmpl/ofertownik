export function explain(role: Role, action: Action, resource: Resource): string | null {
  return can(role, action, resource) ? null : `Brak uprawnienia: ${role} → ${action} ${resource}`;
}

// Per-MPK
export function explainOnMpk(mpkRoles: MpkRolesMap, mpkCode: string, action: Action): string | null {
  const role = mpkRoles[mpkCode] ?? "VIEWER";
  return can(role, action, "mpk") ? null : `MPK ${mpkCode}: ${role} nie ma uprawnienia ${action}`;
}
// --- RBAC per MPK ---

// Rola użytkownika w konkretnym MPK (np. { "Q22-OPS": "MANAGER", "PU-TECH": "PM" })
export type MpkRolesMap = Record<string, Role>;

/** Sprawdź uprawnienia do akcji na konkretnym MPK. */
export function canOnMpk(mpkRoles: MpkRolesMap, mpkCode: string, action: Action): boolean {
  // domyślnie "VIEWER", jeśli nie przypisano
  const role = mpkRoles[mpkCode] ?? "VIEWER";
  // dla akcji na MPK używamy zasobu "mpk" z globalnej macierzy
  return can(role, action, "mpk");
}
export type Role = "LEADER" | "MANAGER" | "PM" | "VIEWER";
export type Resource = "users" | "mpk" | "clients" | "contacts";
export type Action = "view" | "create" | "edit" | "delete";

// Prosty matrix uprawnień (do doprecyzowania później)
const MATRIX: Record<Role, Partial<Record<Resource, Action[]>>> = {
  LEADER:  { users: ["view","create","edit"], mpk: ["view","edit"], clients: ["view","create","edit"], contacts: ["view","create","edit"] },
  MANAGER: { users: ["view"], mpk: ["view","edit"], clients: ["view","edit"], contacts: ["view","create","edit"] },
  PM:      { users: ["view"], mpk: ["view"], clients: ["view"], contacts: ["view","create"] },
  VIEWER:  { users: ["view"], mpk: ["view"], clients: ["view"], contacts: ["view"] },
};

export function can(role: Role, action: Action, resource: Resource): boolean {
  const allowed = MATRIX[role]?.[resource];
  return !!allowed && allowed.includes(action);
}
