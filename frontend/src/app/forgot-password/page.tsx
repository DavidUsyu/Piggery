"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

type ForgotPasswordResponse = {
  message: string;
  resetLink?: string;
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetLink("");
    setCopied(false);

    try {
      const res = await apiPost<ForgotPasswordResponse>("/auth/forgot-password", {
        email,
      });

      setMessage(
        res.message || "If the email exists, a reset link has been generated.",
      );

      if (res.resetLink) {
        setResetLink(res.resetLink);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to generate reset link");
    } finally {
      setLoading(false);
    }
  }

  async function copyResetLink() {
    if (!resetLink) return;

    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setError("Failed to copy reset link");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="hidden rounded-2xl border bg-white p-8 shadow-sm lg:block">
            <div className="text-sm font-medium text-gray-500">
              Password recovery
            </div>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Enter the email linked to your account and generate a password reset
              link so you can sign back in.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Recover access quickly
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Generate a reset link using the email connected to your account.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Continue where you left off
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Keep managing pigs, breeding, tasks, and finances without
                  creating a new account.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Simple recovery flow
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Generate the link here, then open it to set a new password.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <AuthCard
              title="Forgot password"
              subtitle="Enter your email and generate a reset link."
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

                {resetLink && (
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-semibold text-gray-900">
                      Reset Link
                    </div>
                    <div className="mt-2 break-all rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                      {resetLink}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={copyResetLink}
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>

                      <a
                        href={resetLink}
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
                      >
                        Open link
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                >
                  {loading ? "Generating link..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-600">
                Remembered your password?{" "}
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