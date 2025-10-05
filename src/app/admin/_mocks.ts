// Users
export type AdminUserRole = "LEADER" | "MANAGER" | "PM" | "VIEWER";
export type AdminUser = { id: string; name: string; email: string; role: AdminUserRole };
export const MOCK_USERS: AdminUser[] = [
    { id: "u_001", name: "Jan Kowalski", email: "jan.kowalski@ifm.pl", role: "LEADER" },
    { id: "u_002", name: "Anna Nowak", email: "anna.nowak@ifm.pl", role: "PM" },
    { id: "u_003", name: "Piotr Admin", email: "piotr.admin@ifm.pl", role: "MANAGER" },
];

// MPK
export type AdminMpkRole = AdminUserRole;
export type AdminMpk = { code: string; name: string; defaultRole: AdminMpkRole };
export const MOCK_MPK: AdminMpk[] = [
    { code: "Q22-OPS", name: "Q22 – Operacje", defaultRole: "MANAGER" },
    { code: "PU-TECH", name: "Plac Unii – Techniczne", defaultRole: "PM" },
];

// Clients
export type AdminClient = { id: string; name: string; nip: string };
export const MOCK_CLIENTS: AdminClient[] = [
    { id: "c_001", name: "RTV EURO AGD", nip: "5270002721" },
    { id: "c_002", name: "Circle K Polska", nip: "5260210595" },
];

// Contacts
export type AdminContact = { id: string; name: string; email: string; client: string };
export const MOCK_CONTACTS: AdminContact[] = [
    { id: "p_001", name: "Michał Example", email: "m.example@firma.pl", client: "RTV EURO AGD" },
    { id: "p_002", name: "Katarzyna Example", email: "k.example@firma.pl", client: "Circle K Polska" },
];
