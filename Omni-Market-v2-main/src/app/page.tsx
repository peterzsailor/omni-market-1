
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Store,
  ShieldCheck,
  MapPin,
  HeartHandshake,
  Search,
} from "lucide-react";
import MarketplaceSearch from "@/components/MarketplaceSearch";

export default function Home() {
  return (
    <main className="home-page min-h-screen overflow-x-clip bg-[#f7f3ea] text-[#18352d]">
      {/* 1. Welcome and discovery */}
      <section className="home-hero relative isolate overflow-hidden border-b border-[#e6e1d5] bg-[radial-gradient(ellipse_at_top_right,rgba(232,174,69,.22),transparent_45%),linear-gradient(135deg,#fbf8f0_0%,#f7f3ea_58%,#eef2e9_100%)]">
        <div className="pointer-events-none absolute -right-24 top-16 -z-10 h-72 w-72 rounded-full bg-[#dfe8d8]/70 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dce5d8] bg-white/80 px-3.5 py-2 text-xs font-semibold text-[#315e43]">
              <MapPin size={14} />
              Made for shoppers across Kenya
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.06] tracking-[-1.8px] sm:text-6xl lg:text-[68px]">
              Good finds.
              <br />
              <span className="text-[#557c50]">Better everyday.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#5f7066] sm:text-lg">
              Omni Market brings new and pre-loved finds together in one
              welcoming place. Discover something useful, compare your
              options, and connect with sellers around Kenya.
            </p>

            <div className="mt-8 max-w-2xl">
              <MarketplaceSearch />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#607269]">
              <span className="inline-flex items-center gap-1.5">
                <Search size={14} className="text-[#557c50]" />
                Search by product or keyword
              </span>

              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#557c50]" />
                Check details before buying
              </span>
            </div>

            <Link
              href="/explore"
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#123b32] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(18,59,50,.16)] transition hover:bg-[#1b5144]"
            >
              Explore the marketplace
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Homepage information panel */}
          <div className="mx-auto w-full max-w-md min-w-0">
            <div className="home-hero-panel rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_24px_70px_rgba(18,59,50,.10)] backdrop-blur-sm sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[1.8px] text-[#8b6b34]">
                  A marketplace for everyday life
                </span>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8ae45]/25 text-[#123b32]">
                  <Compass size={20} />
                </span>
              </div>

              <div className="mt-7 space-y-3">
                <div className="home-info-row flex items-center gap-4 rounded-2xl bg-[#f3f5ee] p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#315e43]">
                    <Search size={21} />
                  </span>

                  <div className="min-w-0">
                    <p className="font-semibold">Find what you need</p>
                    <p className="mt-1 text-sm leading-5 text-[#718075]">
                      Search products and explore categories.
                    </p>
                  </div>
                </div>

                <div className="home-info-row flex items-center gap-4 rounded-2xl bg-[#fff4df] p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#8a5b13]">
                    <Store size={21} />
                  </span>

                  <div className="min-w-0">
                    <p className="font-semibold">
                      Give good things a new home
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#718075]">
                      List an item and reach interested buyers.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-5 border-t border-[#e7e7dd] pt-4 text-xs leading-5 text-[#718075]">
                Browse at your pace. Check the listing, seller, collection
                and delivery details before you commit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Buyer and seller pathways */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#b47a23]">
            A simple place to start
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            What brings you to Omni Market?
          </h2>

          <p className="mt-4 text-sm leading-6 text-[#718075] sm:text-base">
            Whether you have something in mind or something to sell, your
            next step is easy to find.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
          {/* Buyer pathway */}
          <Link
            href="/explore"
            className="home-pathway group flex min-w-0 flex-col rounded-[1.75rem] border border-[#e1e5da] bg-white p-6 shadow-[0_10px_35px_rgba(18,59,50,.04)] transition hover:-translate-y-1 hover:border-[#b8c9b3] hover:shadow-[0_18px_45px_rgba(18,59,50,.09)] sm:p-8"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2e9] text-[#315e43]">
              <Compass size={25} />
            </span>

            <h3 className="mt-5 text-xl font-bold">
              I want to discover
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#718075]">
              Explore products, compare prices and conditions, and find
              listings that fit your needs.
            </p>

            <span className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#123b32] px-5 py-3 text-sm font-bold text-white transition group-hover:bg-[#1b5144]">
              Explore products
              <ArrowRight size={16} />
            </span>
          </Link>

          {/* Seller pathway */}
          <Link
            href="/sell"
            className="home-pathway home-pathway--sell group flex min-w-0 flex-col rounded-[1.75rem] border border-[#e1e5da] bg-[#fff9ec] p-6 transition hover:-translate-y-1 hover:border-[#e8d2a5] hover:shadow-[0_18px_45px_rgba(138,91,19,.08)] sm:p-8"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f9e8bf] text-[#805516]">
              <Store size={25} />
            </span>

            <h3 className="mt-5 text-xl font-bold">
              I want to sell
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#718075]">
              Create a listing with clear photos, an honest description,
              your price and collection location.
            </p>

            <span className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#e6d3a9] bg-white px-5 py-3 text-sm font-bold text-[#234b35] transition group-hover:border-[#c8aa6b]">
              Create a listing
              <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </section>

      {/* 3. Trust and shopping guidance */}
      <section className="home-trust border-y border-[#e4e4d9] bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-[auto_1fr] md:items-center md:gap-8 lg:px-8 lg:py-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2e9] text-[#315e43]">
            <HeartHandshake size={27} />
          </span>

          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
              Shop thoughtfully. Sell transparently.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#718075]">
              Review real listing photos, condition notes, seller
              information, and the agreed collection or delivery
              arrangements before paying. Seller badges and ratings should
              only appear when supported by genuine checks or buyer
              feedback. Need help? Visit our{" "}
              <Link
                href="/support"
                className="font-semibold text-[#315e43] underline underline-offset-4"
              >
                Support Centre
              </Link>{" "}
              or read our{" "}
              <Link
                href="/refunds"
                className="font-semibold text-[#315e43] underline underline-offset-4"
              >
                returns and refunds information
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
