"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, RefreshCw, WifiOff, Bookmark, Clock, Trash2 } from "lucide-react";
import { products as sampleProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { kenyaCounties } from "@/lib/kenya-locations";

type Listing = {
  id: number | string; name: string; category: string; price: number; condition: string; county?: string;
  seller: string; location: string; image: string; description: string; stock: number; brand?: string | null; attributes?: Record<string, unknown>; delivery_options?: string[]; badge?: string | null; sellerVerified?: boolean; sellerRating?: number; sellerReviews?: number;
};
type ApiProduct = {
  id: string; name: string; description?: string; category: string; county?: string; price_kes: number;
  condition: string; location: string; image_urls?: string[] | null; stock: number; brand?: string | null; attributes?: Record<string, unknown>; delivery_options?: string[]; seller?: { display_name?: string; location?: string | null; verified?: boolean; completed_orders?: number; average_rating?: number; review_count?: number } | null;
};
const conditionFromDb = (value: string) => ({ new: "New", like_new: "Like new", good: "Good", fair: "Fair" }[value] || value);
const normalize = (p: ApiProduct): Listing => ({
  id: p.id, name: p.name, category: p.category, county: p.county, price: p.price_kes,
  condition: conditionFromDb(p.condition), seller: p.seller?.display_name || "Marketplace seller", location: p.location,
  image: p.image_urls?.[0] || "/product-placeholder.svg", description: p.description || "",
  stock: p.stock, brand: p.brand, attributes: p.attributes, delivery_options: p.delivery_options, badge: null, sellerVerified: p.seller?.verified || false, sellerRating: p.seller?.average_rating || 0, sellerReviews: p.seller?.review_count || 0,
});
type SavedSearch = { id: string; label: string; q: string; category: string; condition: string; location: string; county?: string; brand: string; availability: string; delivery: string; attributeKey: string; attributeValue: string; minPrice: string; maxPrice: string; sort: string };
function editDistance(a: string, b: string) { const x=a.toLowerCase(), y=b.toLowerCase(); const row=Array.from({length:y.length+1},(_,i)=>i); for(let i=1;i<=x.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=y.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));prev=old;}}return row[y.length]; }
function Catalogue() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState("All categories");
  const [condition, setCondition] = useState("Any condition");
  const [location, setLocation] = useState("All locations");
  const [county, setCounty] = useState("All counties");
  const [brand, setBrand] = useState("All brands");
  const [availability, setAvailability] = useState("Any availability");
  const [delivery, setDelivery] = useState("Any fulfilment");
  const [attributeKey, setAttributeKey] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [catalogue, setCatalogue] = useState<Listing[]>(sampleProducts as unknown as Listing[]);
  const [liveMode, setLiveMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [total, setTotal] = useState<number>(sampleProducts.length);
  const [page, setPage] = useState(1);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentViewed, setRecentViewed] = useState<Listing[]>([]);
  const categories = [...new Set([...sampleProducts.map(p => p.category), ...catalogue.map(p => p.category)])];
  const brands = [...new Set(catalogue.map(p => p.brand).filter((v): v is string => !!v))].sort();
  const attributeKeys = [...new Set(catalogue.filter(p => category === "All categories" || p.category.toLowerCase() === category.toLowerCase()).flatMap(p => Object.keys(p.attributes || {})))].sort();

  useEffect(() => {
    try { const rawLocation = localStorage.getItem("omni-market-location-v1"); if (rawLocation) { const saved = JSON.parse(rawLocation) as {county?: string;town?:string}; if (saved.county && kenyaCounties.some(c => c.name === saved.county)) setCounty(saved.county); if (saved.town?.trim()) setLocation(saved.town.trim().slice(0,80)); } } catch {/* Location preference is optional. */}
    try { const raw: unknown = JSON.parse(localStorage.getItem("omni-market-saved-searches") || "[]"); if (Array.isArray(raw)) setSavedSearches(raw.filter((v): v is SavedSearch => !!v && typeof v === "object" && typeof v.id === "string" && typeof v.q === "string").slice(0,8)); } catch { setSavedSearches([]); }
    let active = true;
    const loadRecent = async () => {
      try {
        const raw: unknown = JSON.parse(localStorage.getItem("omni-market-recently-viewed") || "[]");
        const ids = Array.isArray(raw) ? raw.map(String).slice(0,8) : [];
        const sampleMap = new Map((sampleProducts as unknown as Listing[]).map(p => [String(p.id), p]));
        const local = ids.map(id => sampleMap.get(id)).filter((p): p is Listing => !!p);
        const liveIds = ids.filter(id => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id));
        const live = await Promise.all(liveIds.map(async id => { try { const r=await fetch(`/api/products?id=${encodeURIComponent(id)}`,{cache:"no-store"}); if(!r.ok)return null; const d=await r.json(); return d.product ? normalize(d.product as ApiProduct) : null; } catch { return null; } }));
        if (active) setRecentViewed(ids.map(id => local.find(p=>String(p.id)===id) || live.find(p=>p&&String(p.id)===id)).filter((p): p is Listing => !!p).slice(0,6));
      } catch { if(active)setRecentViewed([]); }
    };
    void loadRecent(); return () => { active = false; };
  }, []);
  useEffect(() => { setPage(1); }, [query, category, condition, location, county, brand, availability, delivery, attributeKey, attributeValue, minPrice, maxPrice, sort]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: "48", page: String(page), sort });
      if (query.trim()) params.set("q", query.trim());
      if (category !== "All categories") params.set("category", category);
      if (condition !== "Any condition") params.set("condition", ({ "New": "new", "Like new": "like_new", "Good": "good", "Fair": "fair" } as Record<string,string>)[condition] || condition.toLowerCase());
      if (location !== "All locations") params.set("location", location);
      if (county !== "All counties") params.set("county", county);
      if (brand !== "All brands") params.set("brand", brand);
      if (availability !== "Any availability") params.set("available", availability === "In stock" ? "true" : "false");
      if (delivery !== "Any fulfilment") params.set("delivery", delivery === "Delivery" ? "delivery" : "pickup");
      if (attributeKey && attributeValue.trim()) { params.set("attributeKey", attributeKey); params.set("attributeValue", attributeValue.trim()); }
      if (minPrice !== "" && Number(minPrice) >= 0) params.set("minPrice", minPrice);
      if (maxPrice !== "" && Number(maxPrice) >= 0) params.set("maxPrice", maxPrice);
      try {
        const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Live catalogue unavailable");
        const payload = await response.json();
        if (!Array.isArray(payload.products)) throw new Error("Unexpected catalogue response");
        if (!active) return;
        setCatalogue(prev => page === 1 ? payload.products.map(normalize) : [...prev, ...payload.products.map(normalize)]); setTotal(Number(payload.total ?? payload.products.length));
        setLiveMode(true); setNotice("");
      } catch {
        if (!active) return;
        const q = query.trim().toLowerCase();
        let list = (sampleProducts as unknown as Listing[]).filter(p =>
          (!q || `${p.name} ${p.category} ${p.seller} ${p.description} ${p.location}`.toLowerCase().includes(q)) &&
          (category === "All categories" || p.category.toLowerCase() === category.toLowerCase()) &&
          (condition === "Any condition" || p.condition.toLowerCase() === condition.toLowerCase()) &&
          (location === "All locations" || p.location.toLowerCase().includes(location.toLowerCase())) &&
          (county === "All counties" || (p.county || ({Nairobi:"Nairobi City",Kisumu:"Kisumu",Mombasa:"Mombasa",Nakuru:"Nakuru",Eldoret:"Uasin Gishu",Thika:"Kiambu"} as Record<string,string>)[p.location]) === county) &&
          (brand === "All brands" || (p.brand||"").toLowerCase() === brand.toLowerCase()) &&
          (availability === "Any availability" || (availability === "In stock" ? p.stock > 0 : p.stock === 0)) &&
          (minPrice === "" || p.price >= Number(minPrice)) && (maxPrice === "" || p.price <= Number(maxPrice))
        );
        if (sort === "price_asc") list = [...list].sort((a,b)=>a.price-b.price);
        if (sort === "price_desc") list = [...list].sort((a,b)=>b.price-a.price);
        if (sort === "name") list = [...list].sort((a,b)=>a.name.localeCompare(b.name));
        setCatalogue(list); setTotal(list.length); setLiveMode(false);
        setNotice("Showing the sample catalogue. Live listings will appear when Supabase is configured and reachable.");
      } finally { if (active) setLoading(false); }
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, category, condition, location, brand, availability, delivery, attributeKey, attributeValue, minPrice, maxPrice, sort, page]);

  function saveCurrentSearch() {
    const label = [query.trim() || "All products", category !== "All categories" ? category : "", county !== "All counties" ? county : "", location !== "All locations" ? location : ""].filter(Boolean).join(" Â· ").slice(0,100);
    const entry: SavedSearch = { id: `${Date.now()}`, label, q: query, category, condition, location, county, brand, availability, delivery, attributeKey, attributeValue, minPrice, maxPrice, sort };
    const next = [entry, ...savedSearches.filter(v => v.label !== label)].slice(0,8);
    setSavedSearches(next); try { localStorage.setItem("omni-market-saved-searches", JSON.stringify(next)); } catch { setNotice("Browser storage is unavailable, so this search could not be saved."); }
  }
  function applySavedSearch(entry: SavedSearch) { setQuery(entry.q); setCategory(entry.category); setCondition(entry.condition); setLocation(entry.location); setCounty(entry.county || "All counties"); setBrand(entry.brand || "All brands"); setAvailability(entry.availability || "Any availability"); setDelivery(entry.delivery || "Any fulfilment"); setAttributeKey(entry.attributeKey || ""); setAttributeValue(entry.attributeValue || ""); setMinPrice(entry.minPrice); setMaxPrice(entry.maxPrice); setSort(entry.sort); setPage(1); }
  function removeSavedSearch(id: string) { const next=savedSearches.filter(v=>v.id!==id); setSavedSearches(next); try{localStorage.setItem("omni-market-saved-searches",JSON.stringify(next));}catch{/* local storage is optional */} }
  const typoSuggestion = useMemo(() => { if (!query.trim() || catalogue.length) return ""; const terms = [...new Set([...(sampleProducts as unknown as Listing[]).map(p=>p.name), ...(sampleProducts as unknown as Listing[]).map(p=>p.category)])]; const candidate = terms.map(term=>({term,distance:editDistance(query.trim(),term)})).filter(v=>v.distance>0&&v.distance<=Math.max(1,Math.floor(query.trim().length*0.28))).sort((a,b)=>a.distance-b.distance)[0]; return candidate?.term || ""; }, [query, catalogue]);
  function reset() { setPage(1); setQuery(""); setCategory("All categories"); setCondition("Any condition"); setLocation("All locations"); setCounty("All counties"); setBrand("All brands"); setAvailability("Any availability"); setDelivery("Any fulfilment"); setAttributeKey(""); setAttributeValue(""); setMinPrice(""); setMaxPrice(""); setSort("newest"); }
  const heading = useMemo(() => query ? `Results for â€œ${query}â€` : category === "All categories" ? "All products" : category, [query, category]);
  return <main className="min-h-[65vh] px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div className="mx-auto max-w-7xl">
    <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--brand)]">The marketplace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Explore good finds</h1><p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">Search real listings and narrow the results to what works for you.</p>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><label className="flex min-h-12 flex-1 items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4"><Search size={18} className="text-[var(--muted)]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, brands, sellers or keywords" aria-label="Search products" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>{query&&<button onClick={()=>setQuery("")} aria-label="Clear search"><X size={16}/></button>}</label><button onClick={()=>setShowFilters(!showFilters)} aria-expanded={showFilters} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold"><SlidersHorizontal size={16}/> Filters</button><button onClick={saveCurrentSearch} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold" title="Save these search filters"><Bookmark size={15}/> Save search</button><label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"><span className="text-[var(--muted)]">Sort</span><select value={sort} onChange={e=>setSort(e.target.value)} className="bg-transparent font-medium outline-none"><option value="newest">Recently listed</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name">Name Aâ€“Z</option></select></label></div>
    {showFilters&&<div className="mt-4 grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">CATEGORY<select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">CONDITION<select value={condition} onChange={e=>setCondition(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option>Any condition</option><option>New</option><option>Like new</option><option>Good</option><option>Fair</option></select></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">COUNTY<select value={county} onChange={e=>setCounty(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option>All counties</option>{kenyaCounties.map(c=><option key={c.id}>{c.name}</option>)}</select></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">TOWN / LOCALITY<input value={location === "All locations" ? "" : location} onChange={e=>setLocation(e.target.value.trim() ? e.target.value.slice(0,100) : "All locations")} maxLength={100} placeholder="Any town or locality" className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"/></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">BRAND<select value={brand} onChange={e=>setBrand(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option>All brands</option>{brands.map(v=><option key={v}>{v}</option>)}</select></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">AVAILABILITY<select value={availability} onChange={e=>setAvailability(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option>Any availability</option><option>In stock</option><option>Sold out</option></select></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">FULFILMENT<select value={delivery} onChange={e=>setDelivery(e.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option>Any fulfilment</option><option>Delivery</option><option>Pickup</option></select></label>{attributeKeys.length>0&&<><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">PRODUCT ATTRIBUTE<select value={attributeKey} onChange={e=>{setAttributeKey(e.target.value);setAttributeValue("")}} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"><option value="">Any attribute</option>{attributeKeys.map(k=><option key={k} value={k}>{k.replace(/[_-]+/g," ")}</option>)}</select></label>{attributeKey&&<label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">ATTRIBUTE VALUE<input value={attributeValue} onChange={e=>setAttributeValue(e.target.value)} maxLength={100} placeholder={`Enter ${attributeKey.replace(/[_-]+/g," ")}`} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"/></label>}</>}<div className="grid grid-cols-2 gap-2"><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">MIN KSH<input type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0" className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"/></label><label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">MAX KSH<input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="No limit" className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"/></label></div><div className="flex items-center justify-between sm:col-span-2 lg:col-span-4"><p className="text-xs text-[var(--muted)]">Filters update automatically.</p><button onClick={reset} className="text-sm font-semibold text-[var(--brand)] underline">Clear all</button></div></div>}
    {savedSearches.length>0&&<section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Saved searches</h2><span className="text-xs text-[var(--muted)]">Stored on this device</span></div><div className="mt-3 flex flex-wrap gap-2">{savedSearches.map(entry=><span key={entry.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--surface-2)] pl-3 pr-1 py-1"><button onClick={()=>applySavedSearch(entry)} className="max-w-[220px] truncate text-xs font-medium">{entry.label}</button><button onClick={()=>removeSavedSearch(entry.id)} aria-label={`Remove saved search ${entry.label}`} className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--line)]"><X size={13}/></button></span>)}</div></section>}
    <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">{heading}</h2><p className="mt-1 text-sm text-[var(--muted)]">{loading ? "Updating listingsâ€¦" : `${total} ${total===1?"item":"items"} ${liveMode?"from the marketplace":"to explore"}`}</p></div>{!liveMode&&<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--muted)]"><WifiOff size={13}/> Sample catalogue</span>}</div>
    {notice&&<div role="status" className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">{notice}</div>}
    {catalogue.length?<><div aria-busy={loading} className={`mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 ${loading?"opacity-70":"opacity-100"}`}>{catalogue.map(p=><ProductCard key={p.id} product={p}/>)}</div>{liveMode&&catalogue.length<total&&<div className="mt-9 text-center"><button disabled={loading} onClick={()=>setPage(current=>current+1)} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold disabled:opacity-60">{loading?"Loading moreâ€¦":"Load more products"}</button></div>}</>:<div className="mt-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--brand)]"><Search size={21}/></span><h3 className="mt-4 text-lg font-semibold">No matches just yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Try another keyword or loosen a filter to see more products.</p>{typoSuggestion&&<p className="mt-3 text-sm">Did you mean <button onClick={()=>setQuery(typoSuggestion)} className="font-semibold text-[var(--brand)] underline">{typoSuggestion}</button>?</p>}<button onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-[#101827]"><RefreshCw size={15}/> Reset search and filters</button></div>}
    {recentViewed.length>0&&<section className="mt-12"><div className="flex items-center gap-2"><Clock size={17} className="text-[var(--brand)]"/><div><h2 className="text-xl font-semibold">Recently viewed</h2><p className="mt-1 text-sm text-[var(--muted)]">Pick up where you left off on this device.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{recentViewed.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>}
    </div></main>;
}
export default function ExplorePage(){return <Suspense fallback={<main className="min-h-[60vh] p-10 text-center text-sm text-[var(--muted)]">Loading catalogueâ€¦</main>}><Catalogue/></Suspense>}

