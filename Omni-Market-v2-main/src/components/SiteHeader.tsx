
"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  UserRound,
  ArrowRight,
  Heart,
  Bell,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeControls";

const links = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/categories", label: "Categories" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw: unknown = JSON.parse(
          localStorage.getItem("omni-market-cart") || "[]"
        );
        setCartCount(Array.isArray(raw) ? raw.length : 0);
      } catch {
        setCartCount(0);
      }
    };

    read();

    window.addEventListener("storage", read);
    window.addEventListener("omni-cart-change", read);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("omni-cart-change", read);
    };
  }, []);

  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);

  function search(e: FormEvent) {
    e.preventDefault();

    router.push(
      `/explore${
        query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
      }`
    );
  }

  return (
    <header className="site-header sticky top-0 z-50 w-full border-b backdrop-blur-xl">
      <div className="header-main mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-3 px-3 py-3 sm:gap-5 sm:px-5 lg:px-8">
        <Link
          href="/"
          className="brand-mark shrink-0"
          aria-label="Omni Market home"
        >
          <span>Omni</span>
          <i>Market</i>
          <small>GOOD FINDS. BETTER PRICES.</small>
        </Link>

        <nav
          className="header-primary-nav hidden min-w-0 items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href ? "page" : undefined
              }
              className={`nav-link whitespace-nowrap ${
                pathname === link.href ||
                (link.href === "/explore" &&
                  (pathname.startsWith("/category") ||
                    pathname.startsWith("/products")))
                  ? "nav-link-active"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-utilities flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <Link
            href="/login"
            className="icon-link hidden sm:flex"
            aria-label="Sign in"
            title="Sign in"
          >
            <UserRound size={18} />
          </Link>

          <Link
            href="/notifications"
            className="icon-link hidden 2xl:flex"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
          </Link>

          <Link
            href="/wishlist"
            className="icon-link hidden sm:flex"
            aria-label="Saved items"
            title="Saved items"
          >
            <Heart size={18} />
          </Link>

          <Link
            href="/cart"
            className="icon-link relative"
            aria-label={`Shopping cart${
              cartCount ? `, ${cartCount} items` : ""
            }`}
            title="Shopping cart"
          >
            <ShoppingBag size={18} />

            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[#123b32]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Retain the Start selling button */}
          <Link
            href="/sell"
            className="hidden items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 xl:inline-flex"
          >
            Start selling
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="header-search-row border-t border-[var(--line)] px-3 py-2.5 sm:px-5 lg:px-8">
        <form
          onSubmit={search}
          role="search"
          className="header-search mx-auto flex w-full max-w-3xl min-w-0 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 sm:gap-3 sm:p-2"
        >
          <Search
            size={19}
            className="ml-2 shrink-0 text-[var(--muted)]"
          />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search phones, sofas, sneakers…"
            aria-label="Search marketplace"
            className="min-w-0 w-full flex-1 bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-[var(--muted)] sm:text-base"
          />

          <button
            type="submit"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--brand)] px-3 py-2.5 text-xs font-bold text-white transition hover:opacity-90 sm:gap-2 sm:px-5 sm:text-sm"
          >
            Search
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
