"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type Pig = {
  id: string;
  tagNumber: string;
  name: string | null;
  sex: string;
  breed: string | null;
  birthDate: string | null;
  status: string;
  pregnancyStatus: string;
  expectedFarrowingDate: string | null;
  farrowingDaysLeft: number | null;
};

type MeResponse = {
  id: string;
  name: string | null;
  email: string;
  farmId: string | null;
  farmName: string | null;
  role: string | null;
};

function PigNavCard({
  title,
  subtitle,
  value,
  onClick,
}: {
  title: string;
  subtitle: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-base font-semibold text-gray-900">{subtitle}</div>
      <div className="mt-4 text-3xl font-bold text-gray-900">{value}</div>
    </button>
  );
}

function SmallStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function PigsHomePage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [pigsData, meData] = await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<MeResponse>("/auth/me"),
        ]);

        setPigs(pigsData);
        setMe(meData);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load pigs");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const activePigs = useMemo(
    () => pigs.filter((p) => p.status === "ACTIVE"),
    [pigs],
  );

  const femalePigs = useMemo(
    () => pigs.filter((p) => p.status === "ACTIVE" && p.sex === "FEMALE"),
    [pigs],
  );

  const malePigs = useMemo(
    () => pigs.filter((p) => p.status === "ACTIVE" && p.sex === "MALE"),
    [pigs],
  );

  const pregnantPigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          p.status === "ACTIVE" &&
          p.sex === "FEMALE" &&
          p.pregnancyStatus === "PREGNANT",
      ),
    [pigs],
  );

  const returnedToHeatPigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          p.status === "ACTIVE" &&
          p.sex === "FEMALE" &&
          p.pregnancyStatus === "RETURNED_TO_HEAT",
      ),
    [pigs],
  );

  if (loading) {
    return <div className="p-6">Loading pigs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Pig Management
            </h1>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              ← Back to Dashboard
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SmallStatCard label="Total Pigs" value={String(pigs.length)} />
          <SmallStatCard label="Active" value={String(activePigs.length)} />
          <SmallStatCard label="Females" value={String(femalePigs.length)} />
          <SmallStatCard label="Males" value={String(malePigs.length)} />
          <SmallStatCard label="Returned to Heat" value={String(returnedToHeatPigs.length)} />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <PigNavCard
            title="All Pigs"
            subtitle="View and manage all pigs"
            value={String(pigs.length)}
            onClick={() => router.push("/pigs/all")}
          />

          <PigNavCard
            title="Pregnant Pigs"
            subtitle="Track female pigs marked as pregnant"
            value={String(pregnantPigs.length)}
            onClick={() => router.push("/pregnant-pigs")}
          />

          <PigNavCard
            title="Pig Groups"
            subtitle="Manage grouped pigs and bulk actions"
            value={String(activePigs.length)}
            onClick={() => router.push("/pig-groups")}
          />
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <p className="mt-1 text-sm text-gray-600">
            Use this page as a clean entry point into pig management.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-medium text-gray-500">
                Female Pig Status
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Pregnant</span>
                  <span className="font-semibold">{pregnantPigs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Returned to heat</span>
                  <span className="font-semibold">
                    {returnedToHeatPigs.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>All active females</span>
                  <span className="font-semibold">{femalePigs.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm font-medium text-gray-500">
                Farm Snapshot
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>All pigs</span>
                  <span className="font-semibold">{pigs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active pigs</span>
                  <span className="font-semibold">{activePigs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Male pigs</span>
                  <span className="font-semibold">{malePigs.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}