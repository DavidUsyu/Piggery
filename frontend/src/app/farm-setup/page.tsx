"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, hasClientAuthState } from "@/lib/api";
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

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-gray-500">{helper}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 font-medium text-gray-900">{value}</div>
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
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition-colors hover:border-gray-900 hover:bg-gray-900"
    >
      <div className="text-lg font-semibold text-gray-900 group-hover:text-white">{title}</div>
      <div className="mt-1 text-sm text-gray-600 group-hover:text-gray-200">{subtitle}</div>
    </button>
  );
}

export default function FarmSetupPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("days");
  const [startPage, setStartPage] = useState<StartPage>("/dashboard");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!hasClientAuthState()) {
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
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Farm Setup</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Farm Setup & Preferences
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage account details, app preferences, and quick navigation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {savedMessage && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">
              {savedMessage}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Farm Name"
            value={me?.farmName ?? "No farm"}
            helper="Current farm profile"
          />
          <SummaryCard
            label="Role"
            value={me?.role ?? "-"}
            helper="Your current access role"
          />
          <SummaryCard
            label="Age Display"
            value={ageUnit === "days" ? "Days" : "Months"}
            helper="How pig age is shown"
          />
          <SummaryCard
            label="Start Page"
            value={startPageLabel(startPage)}
            helper="Default page after login"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Account"
            subtitle="Basic account and farm information."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Name" value={me?.name ?? "-"} />
              <InfoRow label="Email" value={me?.email ?? "-"} />
              <InfoRow label="Farm Name" value={me?.farmName ?? "-"} />
              <InfoRow label="Role" value={me?.role ?? "-"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Preferences"
            subtitle="Set how the app behaves after login and how age is shown."
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Age Display
                </label>
                <select
                  value={ageUnit}
                  onChange={(e) => setAgeUnit(e.target.value as AgeUnit)}
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Used anywhere pig age is shown.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Default Start Page
                </label>
                <select
                  value={startPage}
                  onChange={(e) => setStartPage(e.target.value as StartPage)}
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                >
                  <option value="/dashboard">Dashboard</option>
                  <option value="/pigs">Pigs</option>
                  <option value="/tasks">Tasks</option>
                  <option value="/reports">Reports</option>
                  <option value="/pregnant-pigs">Pregnant Pigs</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  After login, the app will open this page first.
                </p>
              </div>

              <button
                type="button"
                onClick={savePreferences}
                className="rounded-xl bg-black px-4 py-3 font-medium text-white"
              >
                Save Preferences
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Quick Navigation"
          subtitle="Jump quickly to key farm sections."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <NavCard
              title="Pigs"
              subtitle="Open pig management and pig profiles"
              onClick={() => router.push("/pigs")}
            />
            <NavCard
              title="Pregnant Pigs"
              subtitle="Track pregnant sows and farrowing countdown"
              onClick={() => router.push("/pregnant-pigs")}
            />
            <NavCard
              title="Tasks"
              subtitle="Review due actions and reminders"
              onClick={() => router.push("/tasks")}
            />
              <NavCard
                title="Feed"
                subtitle="Manage feed types and stock left"
                onClick={() => router.push("/feed")}
              />
            <NavCard
              title="Reports"
              subtitle="View farm summaries and trends"
              onClick={() => router.push("/reports")}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function startPageLabel(page: StartPage) {
  if (page === "/dashboard") return "Dashboard";
  if (page === "/pigs") return "Pigs";
  if (page === "/tasks") return "Tasks";
  if (page === "/reports") return "Reports";
  if (page === "/pregnant-pigs") return "Pregnant Pigs";
  return page;
}
