import Link from "next/link";

const NAV = [
  { href: "/admin/users", label: "Użytkownicy" },
  { href: "/admin/mpk", label: "MPK" },
  { href: "/admin/clients", label: "Klienci" },
  { href: "/admin/contacts", label: "Kontakty" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Panel Administratora</h1>

      <nav className="mb-4 flex gap-2 flex-wrap">
        {NAV.map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className="rounded border border-gray-200 px-3 py-1 hover:bg-gray-50"
          >
            {x.label}
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
        {children}
      </section>
    </main>
  );
}
