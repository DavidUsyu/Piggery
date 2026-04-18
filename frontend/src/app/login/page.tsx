"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, setClientAuthState } from "@/lib/api";
import { getStartPage } from "@/lib/preferences";

type LoginResponse = {
  message: string;
};

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

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiPost<LoginResponse>("/auth/login", {
        email: form.email,
        password: form.password,
      });

      setClientAuthState();
      const startPage = getStartPage();
      router.push(startPage);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="hidden rounded-2xl border bg-white p-8 shadow-sm lg:block">
            <div className="text-sm font-medium text-gray-500">Welcome back</div>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">
              Sign in to manage your farm
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Access pigs, finance, reminders, breeding records, and reports from
              one place.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Track daily farm work
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Record treatments, breeding, farrowing, weights, and sales.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Stay on top of reminders
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  View due tasks like pregnancy checks, deworming, and farrowing.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Understand your profit
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  See farm expenses, revenue, and pig-level performance.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <AuthCard
              title="Sign in"
              subtitle="Access your farm dashboard."
            >
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 space-y-2 text-sm text-gray-600">
                <div>
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-medium text-gray-900 underline">
                    Sign up
                  </Link>
                </div>
                <div>
                  Forgot your password?{" "}
                  <Link
                    href="/forgot-password"
                    className="font-medium text-gray-900 underline"
                  >
                    Reset it
                  </Link>
                </div>
                <div>
                  Deleted your account by mistake?{" "}
                  <Link
                    href="/recover-account"
                    className="font-medium text-gray-900 underline"
                  >
                    Recover account
                  </Link>
                </div>
              </div>
            </AuthCard>
          </div>
        </div>
      </div>
    </div>
  );
}
