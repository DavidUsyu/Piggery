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

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    farmName: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiPost<RegisterResponse>("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        farmName: form.farmName,
      });

      router.push("/login");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-gray-500 mt-1">
          Register your farm and start managing pigs.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">

            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input
                className="mt-1 w-full rounded-xl border p-3"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                required
              />
            </div>

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
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Farm Name</label>
            <input
              className="mt-1 w-full rounded-xl border p-3"
              value={form.farmName}
              onChange={(e) => setForm({ ...form, farmName: e.target.value })}
              placeholder="e.g. Green Valley Farm"
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
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}