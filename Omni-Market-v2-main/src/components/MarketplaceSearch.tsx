
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Smartphone,
  Sofa,
  Shirt,
  Sparkles,
} from "lucide-react";

const suggestions = [
  { label: "Phones", icon: Smartphone, q: "phones" },
  { label: "Furniture", icon: Sofa, q: "sofa" },
  { label: "Fashion", icon: Shirt, q: "sneakers" },
  { label: "Great deals", icon: Sparkles, q: "deal" },
];

export default function MarketplaceSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedQuery = query.trim();

    router.push(
      `/explore${
        trimmedQuery ? `?q=${encodeURIComponent(trimmedQuery)}` : ""
      }`
    );
  }

  return (
    <div className="marketplace-search w-full max-w-3xl">
      <form
        onSubmit={submit}
        role="search"
        className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#d9e1d6] bg-white p-2 shadow-[0_14px_45px_rgba(18,59,50,.10)] focus-within:border-[#123b32] focus-within:ring-4 focus-within:ring-[#123b32]/10"
      >
        <Search
          size={21}
          className="ml-2 shrink-0 text-[#557064]"
        />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
          placeholder="Search phones, sofas, sneakers…"
          className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-[#18352d] outline-none placeholder:text-[#87938a] sm:text-base"
        />

        <button
          type="submit"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#123b32] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1b5144] sm:px-6"
        >
          Search
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#63756b]">
        <span className="mr-1 font-semibold">Popular:</span>

        {suggestions.map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.label}
              onClick={() =>
                router.push(
                  `/explore?q=${encodeURIComponent(item.q)}`
                )
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#e1e7de] bg-white/80 px-3 py-2 transition hover:border-[#123b32] hover:text-[#123b32]"
            >
              <Icon size={13} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
