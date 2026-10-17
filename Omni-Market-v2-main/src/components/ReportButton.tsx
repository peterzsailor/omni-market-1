"use client";
import { useState } from 'react';
import { Flag } from 'lucide-react';

export default function ReportButton({ type, targetId, label = 'Report' }: { type: 'product' | 'seller'; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('misleading');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, target_id: targetId, reason, details }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit report.');
      setStatus('Thank you. Your report has been sent to the moderation team.'); setOpen(false); setDetails('');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not submit report.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-3">
    <button type="button" onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] underline underline-offset-4"><Flag size={13}/>{label}</button>
    {open && <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <label className="block text-sm font-medium">Why are you reporting this?
        <select value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <option value="misleading">Misleading information</option><option value="prohibited">Prohibited or unsafe item</option><option value="duplicate">Duplicate listing</option><option value="fraud">Suspected fraud or impersonation</option><option value="harassment">Abusive or suspicious behaviour</option><option value="other">Other concern</option>
        </select>
      </label>
      <label className="block text-sm font-medium">Details (optional)<textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} rows={3} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3" placeholder="Share enough detail for a moderator to review." /></label>
      <div className="flex gap-2"><button disabled={busy} className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Submit report'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">Cancel</button></div>
    </form>}
    {status && <p role="status" className="mt-2 text-xs text-[var(--muted)]">{status}</p>}
  </div>;
}
