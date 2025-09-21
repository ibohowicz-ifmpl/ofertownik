// Strona startowa: wideo tło + turkusowy filtr + logo z nazwą + CTA + stopka
import Link from "next/link";
import Image from "next/image";
import "./home-video.css";

const VIDEO_MP4 = process.env.NEXT_PUBLIC_HOME_VIDEO_MP4 || "/home-bg.mp4";
const VIDEO_WEBM = process.env.NEXT_PUBLIC_HOME_VIDEO_WEBM || "";
const POSTER = process.env.NEXT_PUBLIC_HOME_VIDEO_POSTER || "/home-bg-poster.jpg";
const LOGO_SRC = process.env.NEXT_PUBLIC_BRAND_LOGO || "/logo.svg"; // wrzuć plik do /public
const REDIRECT_MS = Number(process.env.NEXT_PUBLIC_HOME_REDIRECT_MS || "0");

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="home-hero">
      {/* Tło wideo */}
      <div className="video-wrap" aria-hidden="true">
        <video
          key={VIDEO_MP4 + VIDEO_WEBM}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="auto"
          poster={POSTER}
        >
          {VIDEO_WEBM ? <source src={VIDEO_WEBM} type="video/webm" /> : null}
          <source src={VIDEO_MP4} type="video/mp4" />
        </video>
      </div>

      {/* Turkusowy filtr */}
      <div className="overlay" aria-hidden="true" />

      {/* Logo + nazwa (lewy górny róg) */}
      <Link href="/" aria-label="Strona główna" className="brand">
        <Image
          src={LOGO_SRC}
          alt="Logo Innovative Facility Management Polska"
          width={200}
          height={64}
          priority
        />
        <span className="brand-name">Innovative Facility Management Polska</span>
      </Link>

      {/* Treść główna */}
      <section className="content">
        <div className="grid gap-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Ofertownik</h1>
          <p className="subtitle text-base md:text-lg">
            Zarządzaj ofertami od wysłania do realizacji.
          </p>

          {/* Informacja o wersji demo */}
          <p className="demo-note">Wersja demo – logowanie wyłączone.</p>

          {/* CTA: dwa przyciski obok siebie (demo: oba do /offers) */}
          <div className="cta">
            <Link href="/offers" className="btn">Wchodzę</Link>
            <Link href="/offers" className="btn">Zaloguj</Link>
          </div>
        </div>
      </section>

      {/* Stopka (prawy dolny róg) */}
      <div className="footer-credit">© 2025 IFM Polska — Design & Development by I. Bohowicz</div>

      {/* Opcjonalny auto-redirect */}
      {REDIRECT_MS > 0 ? <ClientRedirectGuard ms={REDIRECT_MS} href="/offers" /> : null}
    </main>
  );
}

/* Mały wrapper RSC → Client Component (używany wyłącznie przy auto-redirect) */
import ClientRedirect from "@/components/ClientRedirect";
function ClientRedirectGuard({ ms, href }: { ms: number; href: string }) {
  return <ClientRedirect ms={ms} href={href} />;
}
