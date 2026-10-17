"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AccountForm({ mode }: { mode: "login" | "register" }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("customer");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const email = String(form.get("email") ?? "").trim();
      const password = String(form.get("password") ?? "");
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("/dashboard");
      } else {
        const full_name = String(form.get("full_name") ?? "").trim();
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name, requested_role: role }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
        });
        if (error) throw error;
        if (data.session) window.location.assign("/dashboard");
        else setMessage("Account created. Check your email to confirm your address, then sign in.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed. Check your Supabase configuration and try again."); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    const email = window.prompt("Enter the email address for your account:");
    if (!email) return;
    try { const supabase = createClient(); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` }); if (error) throw error; setMessage("If that account exists, a password reset email has been sent."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not start password recovery."); }
  }
  return <main className="min-h-screen bg-[#fcfcf9] px-4 py-10 text-[#202a22]"><div className="mx-auto max-w-md"><Link href="/" className="text-2xl font-black text-[#234b35]">Omni Market</Link><div className="mt-8 rounded-3xl border border-[#e5e7df] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-[#719267]">Your marketplace</p><h1 className="mt-2 text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-2 text-sm text-gray-500">{mode === "login" ? "Sign in to manage your shopping and listings." : "Join Omni Market to shop or start selling."}</p><form className="mt-7 space-y-4" onSubmit={submit}>{mode === "register" && <><label className="block text-sm font-medium">Full name<input name="full_name" required autoComplete="name" maxLength={120} className="mt-1 w-full rounded-xl border border-[#dfe3d9] px-4 py-3" placeholder="Your name" /></label><label className="block text-sm font-medium">Account type<select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe3d9] px-4 py-3"><option value="customer">Customer</option><option value="seller">Customer and seller</option></select></label></>}<label className="block text-sm font-medium">Email address<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-[#dfe3d9] px-4 py-3" placeholder="you@example.com" /></label><label className="block text-sm font-medium">Password<input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1 w-full rounded-xl border border-[#dfe3d9] px-4 py-3" placeholder="At least 8 characters" /></label><button disabled={busy} className="w-full rounded-full bg-[#234b35] px-5 py-3.5 font-semibold text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl bg-[#f0f4eb] p-3 text-sm text-[#315e43]">{message}</p>}{mode === "login" ? <><p className="mt-5 text-sm text-gray-500">Forgot your password? <button type="button" onClick={resetPassword} className="underline">Reset it</button></p><p className="mt-4 text-sm text-gray-600">New here? <Link className="font-semibold underline" href="/register">Create an account</Link></p></> : <p className="mt-5 text-sm text-gray-600">Already registered? <Link className="font-semibold underline" href="/login">Sign in</Link></p>}</div></div></main>;
}
