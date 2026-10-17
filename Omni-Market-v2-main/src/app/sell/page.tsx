"use client";
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { kenyaCounties } from '@/lib/kenya-locations';
export default function SellPage() {
  const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [previews,setPreviews]=useState<string[]>([]);
  function previewPhotos(files: FileList | null){ if(!files){setPreviews([]);return;} const chosen=Array.from(files).slice(0,5);setPreviews(chosen.map(file=>URL.createObjectURL(file))); }
  useEffect(()=>()=>previews.forEach(url=>URL.revokeObjectURL(url)),[previews]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(''); setError(''); setBusy(true);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { window.location.assign('/login?next=/sell'); return; }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id',user.id).single();
      if (profileError) throw profileError;
      if (profile.role !== 'seller' && profile.role !== 'admin') {
        const { error } = await supabase.rpc('become_seller');
        if (error) throw error;
      }
      const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length > 5) throw new Error('Upload a maximum of five photos.');
      const imageUrls: string[] = [];
      for (const file of files) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Photos must be JPG, PNG or WebP.');
        if (file.size > 5 * 1024 * 1024) throw new Error('Each photo must be 5 MB or smaller.');
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false});
        if (uploadError) throw uploadError;
        imageUrls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
      }
      const { error: insertError } = await supabase.from('products').insert({
        seller_id:user.id, name:String(form.get('name')).trim(), category:String(form.get('category')),
        price_kes:Number(form.get('price')), condition:String(form.get('condition')).toLowerCase().replace(' ','_'),
        location:String(form.get('location')).trim(), county:String(form.get('county')), description:String(form.get('description')).trim(),
        stock:Number(form.get('stock')), image_urls:imageUrls, status:'pending',
      });
      if (insertError) throw insertError;
      formElement.reset(); setMessage('Listing submitted for review. It will appear in the public catalogue after approval.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not publish listing. Check your Supabase setup.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#fcfcf9] px-4 py-8 text-[#202a22] sm:px-8"><div className="mx-auto max-w-3xl"><h1 className="mt-10 text-3xl font-bold sm:text-4xl">List something good</h1><p className="mt-3 text-gray-600">Publish accurate item details and clear photos for shoppers across Kenya.</p><form onSubmit={submit} className="mt-7 space-y-5 rounded-3xl border border-[#e5e7df] bg-white p-6 sm:p-8"><label className="block text-sm font-medium">Product name<input name="name" required minLength={3} maxLength={120} className="mt-1 w-full rounded-xl border p-3" placeholder="e.g. Bluetooth headphones"/></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Category<select name="category" className="mt-1 w-full rounded-xl border p-3"><option>Electronics</option><option>Fashion</option><option>Books</option><option>Home & Living</option><option>Sports</option><option>Other</option></select></label><label className="block text-sm font-medium">Price (KSh)<input name="price" required type="number" min="1" step="1" className="mt-1 w-full rounded-xl border p-3" placeholder="2500"/></label><label className="block text-sm font-medium">Condition<select name="condition" className="mt-1 w-full rounded-xl border p-3"><option value="new">New</option><option value="like_new">Like new</option><option value="good">Good</option><option value="fair">Fair</option></select></label><label className="block text-sm font-medium">County<select name="county" required defaultValue="Nairobi City" className="mt-1 w-full rounded-xl border p-3">{kenyaCounties.map(county=><option key={county.id} value={county.name}>{county.name}</option>)}</select></label><label className="block text-sm font-medium">Town / locality<input name="location" required maxLength={100} className="mt-1 w-full rounded-xl border p-3" placeholder="e.g. Westlands"/></label><label className="block text-sm font-medium">Available stock<input name="stock" required type="number" min="1" max="10000" defaultValue="1" className="mt-1 w-full rounded-xl border p-3"/></label></div><label className="block text-sm font-medium">Description<textarea name="description" required minLength={20} maxLength={5000} rows={5} className="mt-1 w-full rounded-xl border p-3" placeholder="Describe the item, features and any wear..."/></label><label className="block text-sm font-medium">Your product photos (up to 5, max 5 MB each)<p className="mt-1 text-xs text-gray-500">Use actual photos of the item from different angles. Clear, honest photos help buyers shop confidently.</p><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>previewPhotos(e.target.files)} className="mt-3 block w-full text-sm"/></label>{previews.length>0&&<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{previews.map((src,i)=><img key={src} src={src} alt={`Product photo preview ${i+1}`} className="aspect-square w-full rounded-xl border object-cover"/>)}</div>}<button disabled={busy} className="rounded-full bg-[#234b35] px-6 py-3 font-semibold text-white disabled:opacity-60">{busy?'Publishing…':'Submit listing for review'}</button>{error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded-xl bg-[#f0f4eb] p-4 text-sm text-[#315e43]">{message}</p>}<p className="text-xs text-gray-500">Listings are saved in Supabase and start in pending review status.</p></form></div></main>
}
