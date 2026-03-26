"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Pig = {
  id: string;
  tagNumber: string;
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

function formatAgeDays(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  return Math.floor((Date.now() - birth.getTime()) / 86400000);
}

export default function ReportsPage() {
  const router = useRouter();
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
        const [pigsData, tasksData] = await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<DueTask[]>("/tasks/due"),
        ]);
        setPigs(pigsData);
        setTasks(tasksData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load reports");
      }
    }

    load();
  }, [router]);

  const summary = useMemo(() => {
    return {
      total: pigs.length,
      active: pigs.filter((p) => p.status === "ACTIVE").length,
      sold: pigs.filter((p) => p.status === "SOLD").length,
      dead: pigs.filter((p) => p.status === "DEAD").length,
      consumed: pigs.filter((p) => p.status === "CONSUMED").length,
      pregnant: pigs.filter(
        (p) =>
          p.status === "ACTIVE" &&
          p.sex === "FEMALE" &&
          p.pregnancyStatus === "PREGNANT",
      ).length,
      overdue: tasks.filter((t) => t.status === "OVERDUE").length,
      due: tasks.filter((t) => t.status === "DUE").length,
      upcoming: tasks.filter((t) => t.status === "UPCOMING").length,
    };
  }, [pigs, tasks]);

  const statusChartData = [
    { name: "Active", value: summary.active },
    { name: "Sold", value: summary.sold },
    { name: "Dead", value: summary.dead },
    { name: "Consumed", value: summary.consumed },
  ];

  const taskChartData = [
    { name: "Overdue", value: summary.overdue },
    { name: "Due", value: summary.due },
    { name: "Upcoming", value: summary.upcoming },
  ];

  const sexChartData = [
    { name: "Female", value: pigs.filter((p) => p.sex === "FEMALE").length },
    { name: "Male", value: pigs.filter((p) => p.sex === "MALE").length },
  ];

  const breedChartData = Array.from(
    pigs.reduce((map, pig) => {
      const breed = pig.breed ?? "Unknown";
      map.set(breed, (map.get(breed) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));

  const nearFarrowing = pigs
    .filter(
      (p) =>
        p.status === "ACTIVE" &&
        p.sex === "FEMALE" &&
        p.pregnancyStatus === "PREGNANT" &&
        p.farrowingDaysLeft !== null,
    )
    .sort((a, b) => (a.farrowingDaysLeft ?? 9999) - (b.farrowingDaysLeft ?? 9999))
    .slice(0, 5);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex justify-between">
          <h1 className="text-3xl font-semibold">Reports</h1>
          <button
            className="rounded-2xl border px-4 py-2"
            onClick={() => router.push("/dashboard")}
          >
            Back
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm">{error}</div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card label="Total Pigs" value={summary.total} />
          <Card label="Active" value={summary.active} />
          <Card label="Pregnant" value={summary.pregnant} />
          <Card label="Overdue Tasks" value={summary.overdue} />
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Status */}
          <ChartCard title="Pig Status">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusChartData}>
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tasks */}
          <ChartCard title="Tasks">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={taskChartData}>
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sex */}
          <ChartCard title="Sex Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sexChartData}>
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Breed */}
          <ChartCard title="Breed Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={breedChartData}>
                <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* FARROWING TABLE */}
        <div className="mt-6 rounded-2xl border p-5">
          <h2 className="text-xl font-semibold mb-4">
            Nearest Farrowing
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Tag</th>
                <th className="text-left py-2">Breed</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Countdown</th>
              </tr>
            </thead>
            <tbody>
              {nearFarrowing.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.tagNumber}</td>
                  <td>{p.breed ?? "-"}</td>
                  <td>
                    {p.expectedFarrowingDate
                      ? new Date(p.expectedFarrowingDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {p.farrowingDaysLeft === null
                      ? "-"
                      : p.farrowingDaysLeft > 0
                        ? `${p.farrowingDaysLeft} days`
                        : "Due"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* COMPONENTS */

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-5">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}