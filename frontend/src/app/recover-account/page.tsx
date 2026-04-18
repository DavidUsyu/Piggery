"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <div className="text-sm font-medium text-gray-500">Piggery</div>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function RecoverAccountPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="hidden rounded-2xl border bg-white p-8 shadow-sm lg:block">
            <div className="text-sm font-medium text-gray-500">Account recovery</div>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">
              Recover a deleted account
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Enter the email linked to your deleted account. If the account is
              still eligible for recovery, it will be restored automatically.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Restore access
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Recover your login and continue using your farm data.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Keep your records
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Bring back pig profiles, events, tasks, and finance history.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Use the same email
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Recovery depends on the email that was used on the account.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <AuthCard
              title="Recover account"
              subtitle="Enter your email. If the account can be recovered, it will be restored."
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter your email"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                >
                  {loading ? "Recovering..." : "Recover account"}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-600">
                Back to{" "}
                <Link href="/login" className="font-medium text-gray-900 underline">
                  Sign in
                </Link>
              </div>
            </AuthCard>
          </div>
        </div>
      </div>
    </div>
  );
}
