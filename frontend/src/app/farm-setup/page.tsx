"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import {
  getAgeUnit,
  getStartPage,
  setAgeUnit as saveAgeUnit,
  setStartPage as saveStartPage,
  type AgeUnit,
  type StartPage,
} from "@/lib/preferences";

type MeResponse = {
  id: string;
  name: string | null;
  email: string;
  farmId: string | null;
  farmName: string | null;
  role: string | null;
};

export default function FarmSetupPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ageUnit, setAgeUnit] = useState<AgeUnit>("days");
  const [startPage, setStartPage] = useState<StartPage>("/dashboard");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setError(null);

        const meData = await apiGet<MeResponse>("/auth/me");
        setMe(meData);

        setAgeUnit(getAgeUnit());
        setStartPage(getStartPage());
      } catch (err: any) {
        setError(err.message ?? "Failed to load farm setup");
      }
    }

    load();
  }, [router]);

  function savePreferences() {
    saveAgeUnit(ageUnit);
    saveStartPage(startPage);
    setSavedMessage("Preferences saved successfully.");

    setTimeout(() => {
      setSavedMessage("");
    }, 2000);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Farm Setup</h1>
            <p className="mt-2 text-sm text-gray-500">
              Farm identity, account details, and app preferences.
            </p>
          </div>

          <button
            className="rounded-2xl border px-4 py-2"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {savedMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {savedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Account</h2>
            <p className="mt-1 text-sm text-gray-500">
              Basic account and farm information.
            </p>

            <div className="mt-5 space-y-4">
              <InfoRow label="Full Name" value={me?.name ?? "Not set"} />
              <InfoRow label="Email" value={me?.email ?? "—"} />
              <InfoRow label="Role" value={me?.role ?? "—"} />
              <InfoRow label="Farm Name" value={me?.farmName ?? "—"} />
              <InfoRow label="Farm ID" value={me?.farmId ?? "—"} />
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Preferences</h2>
            <p className="mt-1 text-sm text-gray-500">
              Set how the app behaves after login and how age is shown.
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <label className="text-sm font-medium">Age Display</label>
                <select
                  className="mt-2 w-full rounded-xl border p-3"
                  value={ageUnit}
                  onChange={(e) => setAgeUnit(e.target.value as AgeUnit)}
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  Used anywhere pig age is shown.
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Default Start Page</label>
                <select
                  className="mt-2 w-full rounded-xl border p-3"
                  value={startPage}
                  onChange={(e) => setStartPage(e.target.value as StartPage)}
                >
                  <option value="/dashboard">Dashboard</option>
                  <option value="/pigs">Pigs</option>
                  <option value="/tasks">Tasks</option>
                  <option value="/reports">Reports</option>
                  <option value="/pregnant-pigs">Pregnant Pigs</option>
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  After login, the app will open this page first.
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-black p-3 text-white"
                onClick={savePreferences}
              >
                Save Preferences
              </button>
            </div>
          </section>

          <section className="rounded-2xl border p-5 lg:col-span-2">
            <h2 className="text-xl font-semibold">Quick Navigation</h2>
            <p className="mt-1 text-sm text-gray-500">
              Jump quickly to key farm sections.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NavCard
                title="Pigs"
                subtitle="Manage all pigs"
                onClick={() => router.push("/pigs")}
              />
              <NavCard
                title="Pregnant Pigs"
                subtitle="Countdown and farrowing"
                onClick={() => router.push("/pregnant-pigs")}
              />
              <NavCard
                title="Tasks"
                subtitle="Due and overdue reminders"
                onClick={() => router.push("/tasks")}
              />
              <NavCard
                title="Reports"
                subtitle="Farm analytics"
                onClick={() => router.push("/reports")}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 break-all text-base font-medium">{value}</div>
    </div>
  );
}

function NavCard({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-5 text-left transition hover:bg-white/5"
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-500">{subtitle}</div>
    </button>
  );
}