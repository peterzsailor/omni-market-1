
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  X,
} from "lucide-react";

const categories = [
  { name: "All items", emoji: "✳️" },
  { name: "Electronics", emoji: "🎧" },
  { name: "Fashion", emoji: "👟" },
  { name: "Books", emoji: "📚" },
  { name: "Home & Living", emoji: "🪴" },
  { name: "Sports", emoji: "⚽" },
];

const products = [
  {
    id: 1,
    name: "Wireless headphones",
    category: "Electronics",
    price: 2499,
    oldPrice: 3200,
    condition: "Like new",
    seller: "Tech Corner",
    location: "Nairobi",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
    color: "#f1e9df",
    badge: "Popular",
  },
  {
    id: 2,
    name: "Everyday sneakers",
    category: "Fashion",
    price: 3200,
    oldPrice: null,
    condition: "New",
    seller: "Urban Finds",
    location: "Kisumu",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85",
    color: "#f7e5e1",
    badge: "New arrival",
  },
  {
    id: 3,
    name: "Minimal desk lamp",
    category: "Home & Living",
    price: 1850,
    oldPrice: null,
    condition: "Like new",
    seller: "Home Edit",
    location: "Nairobi",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=85",
    color: "#e9ece4",
    badge: null,
  },
  {
    id: 4,
    name: "Classic wristwatch",
    category: "Fashion",
    price: 2750,
    oldPrice: 3500,
    condition: "Good",
    seller: "Style Studio",
    location: "Mombasa",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
    color: "#e9e7df",
    badge: "Great deal",
  },
  {
    id: 5,
    name: "Study essentials",
    category: "Books",
    price: 1200,
    oldPrice: null,
    condition: "Good",
    seller: "Book Haven",
    location: "Nakuru",
    image:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=85",
    color: "#e8e9e3",
    badge: null,
  },
  {
    id: 6,
    name: "Wireless game controller",
    category: "Electronics",
    price: 2100,
    oldPrice: null,
    condition: "Like new",
    seller: "Pixel Store",
    location: "Nairobi",
    image:
      "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=700&q=85",
    color: "#e8e8e8",
    badge: "Popular",
  },
  {
    id: 7,
    name: "Everyday backpack",
    category: "Fashion",
    price: 1600,
    oldPrice: null,
    condition: "New",
    seller: "Carry Co.",
    location: "Eldoret",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85",
    color: "#e7e9e2",
    badge: null,
  },
  {
    id: 8,
    name: "Football",
    category: "Sports",
    price: 950,
    oldPrice: 1200,
    condition: "New",
    seller: "Play Zone",
    location: "Thika",
    image:
      "https://images.unsplash.com/photo-1614632537190-23e4b2e69c29?auto=format&fit=crop&w=700&q=85",
    color: "#f2e9dc",
    badge: "Great deal",
  },
];

const money = (amount: number) =>
  `KSh ${amount.toLocaleString("en-KE")}`;

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All items");
  const [conditionFilter, setConditionFilter] = useState("Any condition");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [sortOrder, setSortOrder] = useState("featured");
  const [maxPrice, setMaxPrice] = useState("100000");
  const [cart, setCart] = useState<number[]>([]);
const [cartOpen, setCartOpen] = useState(false);
const [cartLoaded, setCartLoaded] = useState(false);

useEffect(() => {
  try {
    const savedCart = localStorage.getItem("omni-market-cart");

    if (savedCart) {
      const parsed: unknown = JSON.parse(savedCart);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (id) => typeof id === "number" && products.some((p) => p.id === id)
        )
      ) {
        setCart(parsed);
      }
    }
  } catch {
    localStorage.removeItem("omni-market-cart");
  } finally {
    setCartLoaded(true);
  }
}, []);

useEffect(() => {
  if (cartLoaded) {
    localStorage.setItem("omni-market-cart", JSON.stringify(cart));
  }
}, [cart, cartLoaded]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  const cartItems = useMemo(() => {
  return products
    .map((product) => ({
      ...product,
      quantity: cart.filter((id) => id === product.id).length,
    }))
    .filter((product) => product.quantity > 0);
}, [cart]);

const cartTotal = cartItems.reduce(
  (total, item) => total + item.price * item.quantity,
  0
);

function removeFromCart(id: number) {
  setCart((current) => current.filter((item) => item !== id));
}

function decreaseQuantity(id: number) {
  setCart((current) => {
    const index = current.indexOf(id);

    if (index === -1) return current;

    return current.filter((_, i) => i !== index);
  });
}

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === "All items" || product.category === category;

      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.seller.toLowerCase().includes(term) ||
        product.location.toLowerCase().includes(term);

      const matchesCondition = conditionFilter === "Any condition" || product.condition === conditionFilter;
      const matchesLocation = locationFilter === "All locations" || product.location === locationFilter;
      const matchesPrice = product.price <= Number(maxPrice || 100000);
      return matchesCategory && matchesSearch && matchesCondition && matchesLocation && matchesPrice;
    }).sort((a,b) => sortOrder === "price-low" ? a.price-b.price : sortOrder === "price-high" ? b.price-a.price : a.id-b.id);
  }, [query, category, conditionFilter, locationFilter, sortOrder, maxPrice]);

  function addToCart(id: number) {
    setCart((current) => [...current, id]);
    setNotice("Added to your cart");
    window.setTimeout(() => setNotice(""), 2200);
  }

  function toggleFavorite(id: number) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fcfcf9] text-[#202a22]">
      {/* Announcement */}
      <div className="bg-[#234b35] px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        Your next great find is closer than you think.
        <span className="ml-2 hidden sm:inline">
          Shop smarter with Omni Market.
        </span>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fcfcf9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-5 px-4 py-4 sm:px-8 lg:px-12">
          <a href="/" className="shrink-0">
            <span className="block text-[25px] font-black tracking-[-1.6px] text-[#234b35] sm:text-3xl">
              Omni<span className="text-[#a2bd70]"> </span>Market
            </span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[2px] text-gray-500">
              Discover something good
            </span>
          </a>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="ml-auto hidden max-w-[490px] flex-1 items-center rounded-full border border-[#e5e7df] bg-white px-4 py-3 transition focus-within:border-[#719477] md:flex"
          >
            <Search size={19} className="shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, categories, sellers..."
              aria-label="Search products"
              className="ml-3 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="ml-2 rounded-full bg-[#234b35] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#315e43]"
            >
              Search
            </button>
          </form>

          <nav className="ml-auto hidden items-center gap-5 lg:flex">
            <a
              href="#categories"
              className="text-sm font-medium text-gray-600 transition hover:text-[#234b35]"
            >
              Explore
            </a>
            <a
              href="/sell"
              className="text-sm font-medium text-gray-600 transition hover:text-[#234b35]"
            >
              Sell an item
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="/login"
              aria-label="Sign in"
              className="hidden rounded-full p-2.5 transition hover:bg-[#eef1e9] sm:block"
            >
              <UserRound size={20} />
            </a>

            <button
              onClick={() => setCartOpen(true)}
              onMouseEnter={() => {
                setNotice(
                  cart.length
                    ? `${cart.length} item(s) in your cart`
                    : "Your cart is empty"
                );
                window.setTimeout(() => setNotice(""), 2200);
              }}
              aria-label={`Shopping cart with ${cart.length} items`}
              className="relative rounded-full border border-[#e5e7df] bg-white p-2.5 transition hover:border-[#234b35]"
            >
              <ShoppingBag size={19} />
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#a2bd70] px-1 text-[10px] font-bold text-[#203a28]">
                  {cart.length}
                </span>
              )}
            </button>

            <a
              href="/sell"
              className="hidden items-center gap-2 rounded-full bg-[#234b35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315e43] sm:flex"
            >
              <span>Start selling</span>
              <ArrowDownRight size={16} />
            </a>

            <button
              onClick={() => setMobileMenu((value) => !value)}
              aria-label="Toggle navigation"
              className="rounded-full p-2 hover:bg-[#eef1e9] lg:hidden"
            >
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="border-t border-black/[0.06] bg-white px-5 py-5 lg:hidden">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setMobileMenu(false);
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mb-4 flex items-center gap-2 rounded-xl border p-3"
            >
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find something..."
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </form>
            <div className="flex flex-col gap-4 text-sm font-medium">
              <a href="#categories" onClick={() => setMobileMenu(false)}>
                Explore categories
              </a>
              <a href="/login">Sign in / Create account</a>
              <a href="/sell">Start selling</a>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:px-12 lg:pt-16">
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 lg:grid-cols-[1fr_0.92fr] lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="relative z-10"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfe7d7] bg-[#f0f4eb] px-4 py-2 text-xs font-semibold text-[#315e43] sm:text-sm">
              <Sparkles size={15} />
              A little marketplace with big possibilities
            </div>

            <h1 className="max-w-2xl text-[46px] font-semibold leading-[1.04] tracking-[-2.5px] sm:text-6xl lg:text-[76px] lg:tracking-[-4px]">
              Good finds.
              <br />
              <span className="font-serif font-normal italic text-[#73965e]">
                Better prices.
              </span>
              <br />
              Your kind of shop.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
              From everyday essentials to unexpected treasures, discover
              products from sellers across Kenya — all in one place.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-[#e4e6dd] bg-white p-2 shadow-[0_10px_35px_rgba(25,48,31,0.06)] md:hidden"
            >
              <Search size={20} className="ml-2 shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you looking for?"
                aria-label="Search marketplace"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#234b35] px-4 py-3 text-sm font-semibold text-white"
              >
                Find
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#products"
                className="inline-flex items-center gap-3 rounded-full bg-[#234b35] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#315e43]"
              >
                Explore marketplace
                <ArrowRight size={17} />
              </a>
              <a
                href="/sell"
                className="rounded-full border border-[#dfe2d9] bg-white px-6 py-4 text-sm font-semibold transition hover:border-[#234b35]"
              >
                Sell your stuff
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-gray-500 sm:text-sm">
              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#658958]" />
                Easy discovery
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#658958]" />
                Convenient checkout
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#658958]" />
                Made for everyone
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.15 }}
            className="relative mx-auto w-full max-w-[620px]"
          >
            <div className="absolute -right-5 -top-5 h-36 w-36 rounded-full bg-[#e9efdf] blur-3xl" />
            <div className="absolute -bottom-8 -left-5 h-40 w-40 rounded-full bg-[#f3e7d7] blur-3xl" />

            <div className="relative grid grid-cols-[1.1fr_0.9fr] gap-3 sm:gap-4">
              <div className="relative mt-10 overflow-hidden rounded-[28px] bg-[#eee6d9] sm:rounded-[36px]">
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=85"
                  alt="Curated everyday fashion"
                  className="h-[300px] w-full object-cover sm:h-[420px]"
                />
                <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 p-3 backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-gray-500">
                    Find your style
                  </p>
                  <p className="mt-1 text-sm font-semibold sm:text-base">
                    Everyday favourites
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="overflow-hidden rounded-[28px] bg-[#e7e9e0] sm:rounded-[36px]">
                  <img
                    src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85"
                    alt="Laptop and technology"
                    className="h-[175px] w-full object-cover sm:h-[235px]"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between rounded-[28px] bg-[#234b35] p-5 text-white sm:rounded-[36px] sm:p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <Sparkles size={20} />
                  </div>
                  <div className="mt-7">
                    <p className="text-xs text-white/70 sm:text-sm">
                      Your next favourite
                    </p>
                    <p className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                      Is waiting
                      <br />
                      to be found.
                    </p>
                    <a
                      href="#products"
                      className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#c6dcae]"
                    >
                      Explore finds <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/70 bg-white/95 px-4 py-3 text-xs font-semibold shadow-lg sm:left-0 sm:top-12 sm:translate-x-0 sm:text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf0e4] text-[#315e43]">
                <ShoppingBag size={14} />
              </span>
              A better way to discover
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[#e9eae3] bg-white px-4 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-8">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <ShieldCheck className="text-[#658958]" size={23} />
            <div>
              <p className="text-sm font-semibold">Shop with confidence</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Clear listings and account controls
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <Truck className="text-[#658958]" size={23} />
            <div>
              <p className="text-sm font-semibold">Convenient ordering</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Delivery options at checkout
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <ShoppingBag className="text-[#658958]" size={23} />
            <div>
              <p className="text-sm font-semibold">A place for everyone</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Discover and sell across Kenya
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="px-4 pb-5 pt-14 sm:px-8 sm:pt-20 lg:px-12">
        <div className="mx-auto max-w-[1360px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-[#719267]">
                Browse your way
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Explore categories
              </h2>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                A little something for every part of life.
              </p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((item, index) => (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                onClick={() => {
                  setCategory(item.name);
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 sm:p-5 ${
                  category === item.name
                    ? "border-[#234b35] bg-[#edf2e8]"
                    : "border-[#e9eae3] bg-white hover:border-[#cbd7c2]"
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f2eb] text-2xl transition group-hover:scale-105">
                  {item.emoji}
                </span>
                <span className="mt-4 block text-sm font-semibold">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {item.name === "All items"
                    ? "See everything"
                    : "Explore collection"}
                </span>
              </motion.button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {categories.filter((item) => item.name !== "All items").map((item) => (
              <a key={item.name} href={`/category/${item.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`} className="rounded-full border border-[#e5e7df] bg-white px-3 py-2 text-[#315e43] hover:border-[#719267]">{item.name} collection ↗</a>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-12">
        <div className="mx-auto max-w-[1360px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-[#719267]">
                Handpicked for you
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {category === "All items" ? "Worth a closer look" : category}
              </h2>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                {query
                  ? `Results for "${query}"`
                  : "Fresh finds, good deals and everyday favourites."}
              </p>
            </div>

            <button
              onClick={() => {
                setCategory("All items");
                setQuery("");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#e2e5dc] bg-white px-4 py-2.5 text-sm font-medium transition hover:border-[#234b35]"
            >
              View all <ArrowRight size={15} />
            </button>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map((item) => (
              <button
                key={item.name}
                onClick={() => setCategory(item.name)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-medium transition sm:text-sm ${
                  category === item.name
                    ? "bg-[#234b35] text-white"
                    : "border border-[#e4e6de] bg-white text-gray-600 hover:border-[#234b35] hover:text-[#234b35]"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#e5e7df] bg-white p-3 sm:grid-cols-4">
            <label className="text-xs font-medium text-gray-600">Condition<select value={conditionFilter} onChange={e=>setConditionFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dfe3d9] bg-white p-2 text-sm text-[#202a22]"><option>Any condition</option><option>New</option><option>Like new</option><option>Good</option></select></label>
            <label className="text-xs font-medium text-gray-600">Seller location<select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dfe3d9] bg-white p-2 text-sm text-[#202a22]"><option>All locations</option>{["Nairobi","Kisumu","Mombasa","Nakuru","Eldoret","Thika"].map(loc=><option key={loc}>{loc}</option>)}</select></label>
            <label className="text-xs font-medium text-gray-600">Maximum price (KSh)<input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dfe3d9] p-2 text-sm text-[#202a22]"/></label>
            <label className="text-xs font-medium text-gray-600">Sort by<select value={sortOrder} onChange={e=>setSortOrder(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dfe3d9] bg-white p-2 text-sm text-[#202a22]"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.08 }}
                transition={{ duration: 0.4, delay: (index % 4) * 0.06 }}
                className="group min-w-0"
              >
                <div
                  className="relative overflow-hidden rounded-2xl sm:rounded-[24px]"
                  style={{ backgroundColor: product.color }}
                >
                  <a
                    href={`/products/${product.id}`}
                    aria-label={`View ${product.name}`}
                    className="block overflow-hidden"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="aspect-[4/4.4] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </a>

                  {product.badge && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1.5 text-[9px] font-semibold text-[#234b35] shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:text-[10px]">
                      {product.badge}
                    </span>
                  )}

                  <button
                    onClick={() => toggleFavorite(product.id)}
                    aria-label={
                      favorites.includes(product.id)
                        ? "Remove from favourites"
                        : "Add to favourites"
                    }
                    className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition sm:right-3 sm:top-3 ${
                      favorites.includes(product.id)
                        ? "bg-[#234b35] text-white"
                        : "bg-white/95 text-gray-700 hover:text-[#234b35]"
                    }`}
                  >
                    <Heart
                      size={17}
                      fill={
                        favorites.includes(product.id) ? "currentColor" : "none"
                      }
                    />
                  </button>

                  <button
                    onClick={() => addToCart(product.id)}
                    className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#234b35] shadow-md transition hover:scale-105 hover:bg-[#234b35] hover:text-white sm:bottom-3 sm:right-3"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <ShoppingBag size={17} />
                  </button>
                </div>

                <div className="px-0.5 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug sm:text-base">
                      <a
                        href={`/products/${product.id}`}
                        className="transition hover:text-[#719267]"
                      >
                        {product.name}
                      </a>
                    </h3>
                  </div>

                  <p className="mt-1.5 text-[11px] text-gray-500 sm:text-xs">
                    {product.condition} · {product.category}
                  </p>

                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-bold sm:text-base">
                      {money(product.price)}
                    </span>
                    {product.oldPrice && (
                      <span className="text-[11px] text-gray-400 line-through sm:text-xs">
                        {money(product.oldPrice)}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 sm:text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#edf0e7] text-[9px] font-bold text-[#315e43]">
                      {product.seller.charAt(0)}
                    </span>
                    {product.seller} · {product.location}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#dfe3d9] py-16 text-center">
              <Search className="mx-auto text-gray-400" size={30} />
              <h3 className="mt-4 text-lg font-semibold">
                No matching products yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Try another search or explore a different category.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All items");
                }}
                className="mt-5 rounded-full bg-[#234b35] px-5 py-3 text-sm font-semibold text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Seller call to action */}
      <section className="px-4 pb-16 sm:px-8 sm:pb-24 lg:px-12">
        <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[28px] bg-[#234b35] px-6 py-10 text-white sm:rounded-[36px] sm:px-12 sm:py-14 lg:px-16 lg:py-16">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10 sm:h-96 sm:w-96" />
          <div className="absolute -right-4 -top-12 h-52 w-52 rounded-full border border-white/10 sm:h-72 sm:w-72" />

          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-[#d5e4c8]">
                <Sparkles size={14} /> Your next chapter starts here
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-tight">
                Got something good?
                <br />
                Give it a new home.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
                Turn the things you no longer need into someone else's next
                favourite find. Create a listing and meet your next customer.
              </p>
            </div>

            <a
              href="/sell"
              className="inline-flex w-fit items-center gap-3 rounded-full bg-[#c5dba9] px-6 py-4 text-sm font-semibold text-[#234b35] transition hover:-translate-y-1 hover:bg-white"
            >
              Start selling today <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-[#e6e8df] bg-white px-4 pb-8 pt-12 sm:px-8 sm:pt-14 lg:px-12">
        <div className="mx-auto grid max-w-[1360px] gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <a
              href="/"
              className="text-3xl font-black tracking-[-1.5px] text-[#234b35]"
            >
              Omni<span className="text-[#a2bd70]"> </span>Market
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
              Discover good finds, connect with sellers and shop your way.
              Your next favourite thing might be right here.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Discover</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">
              <a className="hover:text-[#234b35]" href="#products">All products</a>
              <a className="hover:text-[#234b35]" href="#categories">Categories</a>
              <a className="hover:text-[#234b35]" href="/sell">Sell an item</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Your account</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">
              <a className="hover:text-[#234b35]" href="/login">Sign in</a>
              <a className="hover:text-[#234b35]" href="/register">Create account</a>
              <a className="hover:text-[#234b35]" href="/dashboard">My dashboard</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Help & information</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500">
              <a className="hover:text-[#234b35]" href="/contact">Contact us</a>
              <a className="hover:text-[#234b35]" href="/privacy">Privacy policy</a>
              <a className="hover:text-[#234b35]" href="/terms">Marketplace rules</a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-[1360px] flex-col justify-between gap-3 border-t border-[#e9eae3] pt-6 text-xs text-gray-500 sm:flex-row sm:items-center">
          <p>© 2026 Omni Market. All rights reserved.</p>
          <p>Good finds. Better prices.</p>
        </div>
      </footer>


      {/* Feedback toast */}
      
      {/* Shopping cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            aria-label="Close shopping cart"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="relative flex h-full w-full max-w-md flex-col bg-[#fcfcf9] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e6e8df] px-5 py-5">
              <div>
                <h2 id="cart-title" className="text-xl font-bold">
                  Your shopping bag
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {cart.length} item(s) selected
                </p>
              </div>

              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="rounded-full p-2 hover:bg-[#eef1e9]"
              >
                <X size={21} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <ShoppingBag size={42} className="text-[#719267]" />
                <h3 className="mt-4 text-lg font-semibold">
                  Your bag is waiting
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Explore the marketplace and add something you love.
                </p>
                <button
                  onClick={() => {
                    setCartOpen(false);
                    document.getElementById("products")?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                  className="mt-5 rounded-full bg-[#234b35] px-5 py-3 text-sm font-semibold text-white"
                >
                  Explore products
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {cartItems.map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-4 border-b border-[#e6e8df] pb-5"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-24 w-24 rounded-xl object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {money(item.price)} each
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => decreaseQuantity(item.id)}
                            aria-label={`Decrease ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe3d9]"
                          >
                            −
                          </button>

                          <span className="min-w-5 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => addToCart(item.id)}
                            aria-label={`Increase ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe3d9]"
                          >
                            +
                          </button>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto text-xs font-medium text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-bold">
                        {money(item.price * item.quantity)}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="border-t border-[#e6e8df] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-xl font-bold">
                      {money(cartTotal)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Delivery fees, if applicable, will be calculated at
                    checkout.
                  </p>

                  <button
                    onClick={() => {
                      setCartOpen(false);
                      window.location.href = "/checkout";
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#234b35] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#315e43]"
                  >
                    Proceed to checkout <ArrowRight size={17} />
                  </button>

                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-3 w-full rounded-full border border-[#dfe3d9] px-5 py-3 text-sm font-semibold hover:border-[#234b35]"
                  >
                    Continue shopping
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          role="status"
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#234b35] px-5 py-3.5 text-sm font-medium text-white shadow-xl"
        >
          <Check size={17} className="text-[#c5dba9]" />
          {notice}
        </motion.div>
      )}
    </main>
  );
}
