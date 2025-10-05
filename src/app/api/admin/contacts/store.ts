import { MOCK_CONTACTS, type AdminContact } from "@/app/admin/_mocks";

let CONTACTS: AdminContact[] = [...MOCK_CONTACTS];

export function listContacts(): AdminContact[] { return CONTACTS; }
export function createContact(input: { name: string; email: string; client: string }): AdminContact {
  const row: AdminContact = { id: `p_${Date.now()}`, ...input };
  CONTACTS = [row, ...CONTACTS];
  return row;
}
export function updateContact(id: string, patch: Partial<Pick<AdminContact, "name" | "email" | "client">>): AdminContact | null {
  const i = CONTACTS.findIndex(c => c.id === id);
  if (i === -1) return null;
  CONTACTS[i] = { ...CONTACTS[i], ...patch };
  return CONTACTS[i];
}
export function removeContact(id: string): boolean {
  const n = CONTACTS.length;
  CONTACTS = CONTACTS.filter(c => c.id !== id);
  return CONTACTS.length !== n;
}
