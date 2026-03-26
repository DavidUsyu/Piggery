"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

export default function RecoverAccountPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await apiPost<{ message: string }>("/auth/recover-account", {
        email,
      });
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message ?? "Failed to recover account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Recover account</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email to recover your account within 30 days of deletion.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border p-3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            className="w-full rounded-xl bg-black text-white p-3 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Recovering..." : "Recover account"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          Back to{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}