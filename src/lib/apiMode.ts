export function preferDb() {
  return process.env.ADMIN_API_MODE?.toLowerCase() === "db";
}