"use client";
import { MapPin, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_COUNTY, kenyaCounties } from "@/lib/kenya-locations";
const STORAGE_KEY = "omni-market-location-v1";
export default function LocationPicker(){
 const [county,setCounty]=useState<string>(DEFAULT_COUNTY);
 const [town,setTown]=useState("");
 const [saved,setSaved]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const value=JSON.parse(raw) as {county?:string;town?:string};if(value.county&&kenyaCounties.some(c=>c.name===value.county))setCounty(value.county);if(value.town)setTown(value.town)}}catch{/* Location is optional; browsing remains available. */}},[]);
 function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({county,town:town.trim()}));setSaved(true);window.setTimeout(()=>setSaved(false),2200)}catch{setSaved(false)}}
 return <section aria-label="Shopping location" className="location-panel flex min-w-0 flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-end sm:gap-4 sm:p-5">
  <div className="flex min-w-0 flex-1 items-start gap-3"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--brand)]"><MapPin size={19}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Shop around your area</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Choose a county and optional town to prefill Explore filters. You can still browse all of Kenya.</p></div></div>
  <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-semibold sm:max-w-[220px]">County<span className="relative"><select value={county} onChange={e=>setCounty(e.target.value)} className="w-full min-w-0 appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 pr-9 text-sm font-normal text-[var(--text)]">{kenyaCounties.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/></span></label>
  <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-semibold sm:max-w-[200px]">Town or area (optional)<input value={town} onChange={e=>setTown(e.target.value)} maxLength={80} placeholder="e.g. Ongata Rongai" className="w-full min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal text-[var(--text)]"/></label>
  <button type="button" onClick={save} className="shrink-0 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">{saved?"Location saved":"Save location"}</button>
 </section>
}
