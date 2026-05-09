"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, hasClientAuthState } from "@/lib/api";

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

type PigStage = "Piglet" | "Weaner" | "Grower" | "Finisher" | "No Birth Date";

function normalizePigValue(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function getPigStage(birthDate: string | null): PigStage {
  if (!birthDate) return "No Birth Date";

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "No Birth Date";

  const ageDays = Math.max(
    1,
    Math.floor((Date.now() - birth.getTime()) / 86400000),
  );

  if (ageDays <= 28) return "Piglet";
  if (ageDays <= 84) return "Weaner";
  if (ageDays <= 132) return "Grower";
  return "Finisher";
}

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
      className="group w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition-colors hover:border-gray-900 hover:bg-gray-900"
    >
      <div className="text-sm font-medium text-gray-500 group-hover:text-gray-200">{title}</div>
      <div className="mt-2 text-base font-semibold text-gray-900 group-hover:text-white">{subtitle}</div>
      <div className="mt-4 text-3xl font-bold text-gray-900 group-hover:text-white">{value}</div>
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

  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasClientAuthState()) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const pigsData = await apiGet<Pig[]>("/pigs");

        setPigs(pigsData);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load pigs");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const activePigs = useMemo(
    () => pigs.filter((p) => normalizePigValue(p.status) === "ACTIVE"),
    [pigs],
  );

  const femalePigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          normalizePigValue(p.status) === "ACTIVE" &&
          normalizePigValue(p.sex) === "FEMALE",
      ),
    [pigs],
  );

  const malePigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          normalizePigValue(p.status) === "ACTIVE" &&
          normalizePigValue(p.sex) === "MALE",
      ),
    [pigs],
  );

  const pregnantPigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          normalizePigValue(p.status) === "ACTIVE" &&
          normalizePigValue(p.sex) === "FEMALE" &&
          normalizePigValue(p.pregnancyStatus) === "PREGNANT",
      ),
    [pigs],
  );

  const returnedToHeatPigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          normalizePigValue(p.status) === "ACTIVE" &&
          normalizePigValue(p.sex) === "FEMALE" &&
          normalizePigValue(p.pregnancyStatus) === "RETURNED_TO_HEAT",
      ),
    [pigs],
  );

  const pigStageCounts = useMemo(() => {
    const counts: Record<PigStage, number> = {
      Piglet: 0,
      Weaner: 0,
      Grower: 0,
      Finisher: 0,
      "No Birth Date": 0,
    };

    for (const pig of activePigs) {
      counts[getPigStage(pig.birthDate)] += 1;
    }

    return counts;
  }, [activePigs]);

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
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
            >
              Back to Dashboard
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
          <SmallStatCard label="Piglets" value={String(pigStageCounts.Piglet)} />
          <SmallStatCard label="Weaners" value={String(pigStageCounts.Weaner)} />
          <SmallStatCard label="Finishers" value={String(pigStageCounts.Finisher)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SmallStatCard label="Females" value={String(femalePigs.length)} />
          <SmallStatCard label="Males" value={String(malePigs.length)} />
          <SmallStatCard label="Growers" value={String(pigStageCounts.Grower)} />
          <SmallStatCard label="No Birth Date" value={String(pigStageCounts["No Birth Date"])} />
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

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                Pig Stage Counts
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Piglets</span>
                  <span className="font-semibold">{pigStageCounts.Piglet}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Weaners</span>
                  <span className="font-semibold">{pigStageCounts.Weaner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Growers</span>
                  <span className="font-semibold">{pigStageCounts.Grower}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Finishers</span>
                  <span className="font-semibold">{pigStageCounts.Finisher}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>No birth date</span>
                  <span className="font-semibold">
                    {pigStageCounts["No Birth Date"]}
                  </span>
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
