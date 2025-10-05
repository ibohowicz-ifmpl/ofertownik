import Link from "next/link";

const items = [
  { href: "/admin/users", label: "Użytkownicy" },
  { href: "/admin/mpk", label: "MPK (jednostki/role)" },
  { href: "/admin/clients", label: "Klienci" },
  { href: "/admin/contacts", label: "Kontakty" },
];

export default function AdminHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((x) => (
        <Link
          key={x.href}
          href={x.href}
          className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
        >
          <div className="text-lg font-medium">{x.label}</div>
          <div className="text-sm text-gray-500">{x.href}</div>
        </Link>
      ))}
    </div>
  );
}
