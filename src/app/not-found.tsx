export default function NotFound() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Nie znaleziono (404)</h1>
      <a href="/offers" style={{ textDecoration: "underline", marginTop: 12, display: "inline-block" }}>
        Wróć do ofert
      </a>
    </main>
  );
}
