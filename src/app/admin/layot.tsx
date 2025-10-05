export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Panel Administratora</h1>
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
        {children}
      </section>
    </main>
  );
}
