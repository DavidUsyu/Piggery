"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

type ForgotPasswordResponse = {
  message: string;
  resetLink?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetLink("");

    try {
      const res = await apiPost<ForgotPasswordResponse>("/auth/forgot-password", {
        email,
      });

      setMessage(res.message || "If the email exists, a reset link has been generated.");
      if (res.resetLink) {
        setResetLink(res.resetLink);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to generate reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email and we’ll generate a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border p-3"
              type="email"
              placeholder="you@example.com"
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

          {resetLink && (
            <div className="rounded-2xl border p-4 text-sm space-y-3">
              <div className="font-medium">Reset Link</div>

              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border p-2 text-xs"
                  value={resetLink}
                  readOnly
                />

                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-xs hover:bg-gray-100"
                  onClick={() => {
                    navigator.clipboard.writeText(resetLink);
                  }}
                >
                  Copy
                </button>
              </div>

              <a
                href={resetLink}
                className="text-xs underline text-blue-600"
              >
                Open link
              </a>
            </div>
          )}

          <button
            className="w-full rounded-xl bg-black text-white p-3 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Generating link..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          Remembered your password?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}