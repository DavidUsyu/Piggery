"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";

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

function farrowingCountdownLabel(daysLeft: number | null) {
  if (daysLeft === null) return "—";
  if (daysLeft > 0) return `${daysLeft} days left`;
  if (daysLeft === 0) return "Due today";
  return `${Math.abs(daysLeft)} days overdue`;
}

export default function PregnantPigsPage() {
  const router = useRouter();
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
        const allPigs = await apiGet<Pig[]>("/pigs");
        const pregnantPigs = allPigs.filter(
          (p) =>
            p.sex === "FEMALE" &&
            p.status === "ACTIVE" &&
            p.pregnancyStatus === "PREGNANT",
        );
        setPigs(pregnantPigs);
      } catch (err: any) {
        setError(err.message ?? "Failed to load pregnant pigs");
      }
    }

    load();
  }, [router]);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Pregnant Pigs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Active female pigs currently marked as pregnant.
            </p>
          </div>

          <button
            className="rounded-xl border px-4 py-2"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300">Tag Number</th>
                <th className="text-left py-3 px-4 text-gray-300">Breed</th>
                <th className="text-left py-3 px-4 text-gray-300">Pregnancy Status</th>
                <th className="text-left py-3 px-4 text-gray-300">Expected Farrowing</th>
                <th className="text-left py-3 px-4 text-gray-300">Countdown</th>
                <th className="text-left py-3 px-4 text-gray-300">Action</th>
              </tr>
            </thead>

            <tbody>
              {pigs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-gray-500">
                    No pregnant pigs found.
                  </td>
                </tr>
              ) : (
                pigs.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-3 px-4">{p.tagNumber}</td>
                    <td className="py-3 px-4">{p.breed ?? "-"}</td>
                    <td className="py-3 px-4">Pregnant</td>
                    <td className="py-3 px-4">
                      {p.expectedFarrowingDate
                        ? new Date(p.expectedFarrowingDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {farrowingCountdownLabel(p.farrowingDaysLeft)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="rounded-xl border px-3 py-2 text-sm"
                        onClick={() => router.push(`/pigs/${p.id}`)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}