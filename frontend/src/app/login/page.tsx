"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { getStartPage } from "@/lib/preferences";

type LoginResponse = {
  accessToken: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiPost<LoginResponse>("/auth/login", {
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", res.accessToken);

      const startPage = getStartPage();
      router.push(startPage);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-gray-500 mt-1">
          Access your farm dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border p-3"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="mt-1 w-full rounded-xl border p-3"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            className="w-full rounded-xl bg-black text-white p-3 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500">
          <div>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>

          <div>
            Forgot your password?{" "}
            <Link href="/forgot-password" className="underline">
              Reset it
            </Link>
          </div>

          <div>
            Deleted your account by mistake?{" "}
            <Link href="/recover-account" className="underline">
              Recover account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}