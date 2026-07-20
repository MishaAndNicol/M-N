"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isFirebaseConfigured, getAuthInstance } from "@/lib/firebase";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isFirebaseConfigured) {
      setError("Firebase isn't connected yet. Add your project config to .env.local to enable admin login.");
      return;
    }

    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const auth = getAuthInstance();
      if (!auth) throw new Error("Auth unavailable");
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch {
      setError("Couldn't sign in - check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center pt-24">
      <div className="w-full max-w-sm rounded-2xl border border-line p-8 dark:border-line-dark">
        <div className="mb-6 flex items-center gap-2 text-thread">
          <Lock className="h-4 w-4" />
          <span className="eyebrow text-thread">Admin</span>
        </div>
        <h1 className="font-display text-2xl">Sign in</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-transparent px-4 py-3 text-sm outline-none focus:border-thread dark:border-line-dark"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-transparent px-4 py-3 text-sm outline-none focus:border-thread dark:border-line-dark"
          />
          {error && <p className="text-xs text-ember">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-ink px-6 py-3 text-sm text-paper disabled:opacity-60 dark:bg-paper dark:text-ink"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
