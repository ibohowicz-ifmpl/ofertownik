import { MOCK_CLIENTS, type AdminClient } from "@/app/admin/_mocks";

let CLIENTS: AdminClient[] = [...MOCK_CLIENTS];

export function listClients(): AdminClient[] { return CLIENTS; }
export function createClient(input: { name: string; nip: string }): AdminClient {
  const row: AdminClient = { id: `c_${Date.now()}`, ...input };
  CLIENTS = [row, ...CLIENTS];
  return row;
}
export function updateClient(id: string, patch: Partial<Pick<AdminClient, "name" | "nip">>): AdminClient | null {
  const i = CLIENTS.findIndex(c => c.id === id);
  if (i === -1) return null;
  CLIENTS[i] = { ...CLIENTS[i], ...patch };
  return CLIENTS[i];
}
export function removeClient(id: string): boolean {
  const n = CLIENTS.length;
  CLIENTS = CLIENTS.filter(c => c.id !== id);
  return CLIENTS.length !== n;
}
