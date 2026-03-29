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

type DueTask = {
  pigId: string;
  tagNumber: string;
  task: string;
  dueDate: string;
  daysLeft: number;
  status: "UPCOMING" | "DUE" | "OVERDUE";
  reason: string;
};

type MeResponse = {
  id: string;
  name: string | null;
  email: string;
  farmId: string | null;
  farmName: string | null;
  role: string | null;
};

type DashboardCardProps = {
  title: string;
  emoji: string;
  subtitle: string;
  value?: string;
  onClick: () => void;
};

function DashboardCard({
  title,
  emoji,
  subtitle,
  value,
  onClick,
}: DashboardCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-3xl border p-6 text-left transition hover:scale-[1.01] hover:bg-white/5"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border text-4xl shadow-sm">
        {emoji}
      </div>

      <div className="mt-6 text-center">
        <div className="text-2xl font-semibold">{title}</div>
        <div className="mt-2 text-sm text-gray-500">{subtitle}</div>
        {value && <div className="mt-3 text-lg font-medium">{value}</div>}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [tasks, setTasks] = useState<DueTask[]>([]);
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

        const [pigsData, tasksData, meData] = await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<DueTask[]>("/tasks/due"),
          apiGet<MeResponse>("/auth/me"),
        ]);

        setPigs(pigsData);
        setTasks(tasksData);
        setMe(meData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load dashboard");
      }
    }

    load();
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? You can recover it within 30 days.",
    );
    if (!confirmed) return;

    try {
      setError(null);
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/account`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to delete account");
      }

      localStorage.removeItem("token");
      router.push("/login");
    } catch (err: any) {
      setError(err.message ?? "Failed to delete account");
    }
  }

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

  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.status === "OVERDUE").length,
    [tasks],
  );

  const dueTasks = useMemo(
    () => tasks.filter((t) => t.status === "DUE").length,
    [tasks],
  );

  const upcomingTasks = useMemo(
    () => tasks.filter((t) => t.status === "UPCOMING").length,
    [tasks],
  );

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>

            {me && (
              <div className="mt-2 text-sm text-gray-500">
                {me.name ?? me.email} • {me.farmName ?? "No farm"}
                {me.role ? ` • ${me.role}` : ""}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-2xl border px-4 py-3 text-sm">
                Active Pigs: <span className="font-semibold">{activePigs.length}</span>
              </div>
              <div className="rounded-2xl border px-4 py-3 text-sm">
                Pregnant: <span className="font-semibold">{pregnantPigs.length}</span>
              </div>
              <div className="rounded-2xl border px-4 py-3 text-sm">
                Overdue Tasks: <span className="font-semibold">{overdueTasks}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl border px-4 py-2"
              onClick={() => router.push("/recover-account")}
            >
              Recover Account
            </button>

            <button className="rounded-2xl border px-4 py-2" onClick={logout}>
              Logout
            </button>

            <button
              className="rounded-2xl border px-4 py-2"
              onClick={deleteAccount}
            >
              Delete Account
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Pigs"
            emoji="🐖"
            subtitle="Manage pigs, pregnant pigs, and pig groups."
            value={`${pigs.length} total`}
            onClick={() => router.push("/pigs")}
          />

          <DashboardCard
            title="Events"
            emoji="📅"
            subtitle="View farm activity, treatments, breeding, and notes."
            value={pigs.length > 0 ? "Farm activity" : "No pigs yet"}
            onClick={() => router.push("/events")}
          />

          <DashboardCard
            title="Tasks"
            emoji="✅"
            subtitle="Upcoming reminders for checks, vaccines, and breeding."
            value={`${overdueTasks} overdue • ${dueTasks} due • ${upcomingTasks} upcoming`}
            onClick={() => router.push("/tasks")}
          />

          <DashboardCard
            title="Finance"
            emoji="💰"
            subtitle="Track sales, expenses, and profit/loss"
            onClick={() => router.push("/finance")}
          />

          <DashboardCard
            title="Reports"
            emoji="📊"
            subtitle="Farm summaries, performance, and analytics."
            value="View insights"
            onClick={() => router.push("/reports")}
          />

          <DashboardCard
            title="Farm Setup"
            emoji="🛠️"
            subtitle="Farm profile, preferences, and system settings."
            value={me?.farmName ?? "Setup"}
            onClick={() => router.push("/farm-setup")}
          />

          <DashboardCard
            title="Bulk Events"
            emoji="📦"
            subtitle="Apply one event to a group or many pigs."
            value="Group actions"
            onClick={() => router.push("/bulk-events")}
          />
        </div>
      </div>
    </div>
  );
}