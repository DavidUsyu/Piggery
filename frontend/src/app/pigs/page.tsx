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
      onClick={onClick}
      className="min-h-[260px] rounded-2xl border p-6 text-left transition hover:bg-white/5"
    >
      <div className="text-2xl font-semibold">{title}</div>
      <div className="mt-3 text-base text-gray-500">{subtitle}</div>
      <div className="mt-6 text-lg font-medium">{value}</div>
    </button>
  );
}

export default function PigsHomePage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setError(null);

        const [pigsData, meData] = await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<MeResponse>("/auth/me"),
        ]);

        setPigs(pigsData);
        setMe(meData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load pigs");
      }
    }

    load();
  }, [router]);

  const activePigs = useMemo(
    () => pigs.filter((p) => p.status === "ACTIVE"),
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

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Pigs</h1>
            <div className="mt-2 text-sm text-gray-500">
              {me?.farmName ?? "Farm"} • {activePigs.length} active pigs •{" "}
              {pregnantPigs.length} pregnant
            </div>
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

        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3">
          <PigNavCard
            title="All Pigs"
            subtitle="View the full herd, add pigs, and open pig profiles."
            value={`${pigs.length} total pigs`}
            onClick={() => router.push("/pigs/all")}
          />

          <PigNavCard
            title="Pregnant Pigs"
            subtitle="Track pregnant sows and farrowing countdowns."
            value={`${pregnantPigs.length} pregnant pigs`}
            onClick={() => router.push("/pregnant-pigs")}
          />

          <PigNavCard
            title="Pig Groups"
            subtitle="Organize piglets and batches like Group A."
            value="Create and manage groups"
            onClick={() => router.push("/pig-groups")}
          />
        </div>
      </div>
    </div>
  );
}