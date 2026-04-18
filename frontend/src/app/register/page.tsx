"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";

type RegisterResponse = {
  message: string;
  userId: string;
  farmId: string;
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

export default function RegisterPage() {
  const router = useRouter();
  const passwordRule =
    "Use at least 8 characters, including uppercase, lowercase, and a number.";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    farmName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage("");
    setLoading(true);

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError(passwordRule);
      setLoading(false);
      return;
    }

    try {
      await apiPost<RegisterResponse>("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        farmName: form.farmName,
      });

      setMessage("Account created successfully. Redirecting to sign in...");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="hidden rounded-2xl border bg-white p-8 shadow-sm lg:block">
            <div className="text-sm font-medium text-gray-500">Get started</div>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">
              Create your farm account
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Register your farm and start managing pigs, breeding records,
              reminders, and finances.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  One place for farm records
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Keep pig profiles, weights, treatments, and outcomes organized.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Breeding and pregnancy tracking
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Record breeding, pregnancy checks, farrowing, and reminders.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Finance and reports
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Track expenses, sales, and farm performance over time.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <AuthCard
              title="Create account"
              subtitle="Register your farm and start managing pigs."
            >
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter your full name"
                  />
                </div>

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
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="Create a password"
                  />
                  <p className="mt-1 text-xs text-gray-500">{passwordRule}</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Farm Name
                  </label>
                  <input
                    type="text"
                    value={form.farmName}
                    onChange={(e) =>
                      setForm({ ...form, farmName: e.target.value })
                    }
                    required
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="e.g. Green Valley Farm"
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
                  {loading ? "Creating account..." : "Sign up"}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-600">
                Already have an account?{" "}
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
