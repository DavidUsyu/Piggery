"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiGet, apiPost } from "@/lib/api";
import { formatAge, getAgeUnit, type AgeUnit } from "@/lib/preferences";

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

function pregnancyStatusLabel(status: string) {
  if (status === "NOT_PREGNANT") return "Not Pregnant";
  if (status === "PREGNANT") return "Pregnant";
  if (status === "RETURNED_TO_HEAT") return "Returned to Heat";
  return status;
}

function farrowingCountdownLabel(daysLeft: number | null) {
  if (daysLeft === null) return "—";
  if (daysLeft > 0) return `${daysLeft} days left`;
  if (daysLeft === 0) return "Due today";
  return `${Math.abs(daysLeft)} days overdue`;
}

export default function AllPigsPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("days");
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    tagNumber: "",
    sex: "FEMALE",
    breed: "",
  });

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
        setAgeUnit(getAgeUnit());
      } catch (err: any) {
        setError(err.message ?? "Failed to load pigs");
      }
    }

    load();
  }, [router]);

  async function reloadPigs() {
    try {
      const pigsData = await apiGet<Pig[]>("/pigs");
      setPigs(pigsData);
    } catch (err: any) {
      setError(err.message ?? "Failed to reload pigs");
    }
  }

  async function addPig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        tagNumber: form.tagNumber,
        sex: form.sex,
        breed: form.breed || undefined,
        birthDate: birthDate ? birthDate.toISOString() : undefined,
      };

      await apiPost("/pigs", payload);

      setForm({
        tagNumber: "",
        sex: "FEMALE",
        breed: "",
      });
      setBirthDate(null);

      await reloadPigs();
    } catch (err: any) {
      setError(err.message ?? "Failed to add pig");
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">All Pigs</h1>
            <div className="mt-2 text-sm text-gray-500">
              {me?.farmName ?? "Farm"} • {activePigs.length} active pigs •{" "}
              {pregnantPigs.length} pregnant
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl border px-4 py-2"
              onClick={() => router.push("/pigs")}
            >
              Back to Pigs
            </button>

            <button
              className="rounded-2xl border px-4 py-2"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border p-5 xl:col-span-1">
            <h2 className="text-xl font-semibold">Add Pig</h2>
            <p className="mt-1 text-sm text-gray-500">
              Register a new pig and its basic details.
            </p>

            <form onSubmit={addPig} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Tag Number</label>
                <input
                  className="mt-1 w-full rounded-xl border p-3"
                  placeholder="e.g. P-007"
                  value={form.tagNumber}
                  onChange={(e) =>
                    setForm({ ...form, tagNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Sex</label>
                <select
                  className="mt-1 w-full rounded-xl border p-3"
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                >
                  <option value="FEMALE">FEMALE</option>
                  <option value="MALE">MALE</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Breed</label>
                <select
                  className="mt-1 w-full rounded-xl border p-3"
                  value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                >
                  <option value="">Select Breed</option>
                  <option value="Local">Local</option>
                  <option value="Large White">Large White</option>
                  <option value="Landrace">Landrace</option>
                  <option value="Duroc">Duroc</option>
                  <option value="Camborough">Camborough</option>
                  <option value="Crossbreed">Crossbreed</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Birth Date</label>
                <div className="mt-1">
                  <DatePicker
                    selected={birthDate}
                    onChange={(date) => setBirthDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select birth date"
                    className="w-full rounded-xl border p-3"
                    maxDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Tip: adding birth date enables age, stage, and timeline tasks.
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-black p-3 text-white disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Pig"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border p-5 xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Pig List</h2>
                <p className="mt-1 text-sm text-gray-500">
                  View status, pregnancy progress, and farrowing countdowns.
                </p>
              </div>

              <div className="rounded-xl border px-4 py-3 text-sm">
                Age display: <span className="font-medium">{ageUnit}</span>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border">
              <table className="min-w-[1400px] w-full table-auto text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="min-w-[120px] px-4 py-3 text-left">
                      Tag Number
                    </th>
                    <th className="min-w-[100px] px-4 py-3 text-left">Sex</th>
                    <th className="min-w-[160px] px-4 py-3 text-left">Breed</th>
                    <th className="min-w-[120px] px-4 py-3 text-left">Age</th>
                    <th className="min-w-[120px] px-4 py-3 text-left">Status</th>
                    <th className="min-w-[180px] px-4 py-3 text-left">
                      Pregnancy
                    </th>
                    <th className="min-w-[180px] px-4 py-3 text-left">
                      Expected Farrowing
                    </th>
                    <th className="min-w-[160px] px-4 py-3 text-left">
                      Countdown
                    </th>
                    <th className="min-w-[120px] px-4 py-3 text-left">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pigs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-gray-500">
                        No pigs added yet.
                      </td>
                    </tr>
                  ) : (
                    pigs.map((p) => (
                      <tr key={p.id} className="border-b align-top">
                        <td className="whitespace-nowrap px-4 py-3">
                          {p.tagNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{p.sex}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {p.breed ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatAge(p.birthDate, ageUnit)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {p.status}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {pregnancyStatusLabel(p.pregnancyStatus)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {p.expectedFarrowingDate
                            ? new Date(
                                p.expectedFarrowingDate,
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {farrowingCountdownLabel(p.farrowingDaysLeft)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
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
          </section>
        </div>
      </div>
    </div>
  );
}