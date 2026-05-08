"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiDelete, apiGet, apiPost, hasClientAuthState } from "@/lib/api";
import { formatDate } from "@/lib/dates";
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

function normalizePigValue(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function farrowingCountdownLabel(daysLeft: number | null) {
  if (daysLeft === null) return "-";
  if (daysLeft > 0) return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  if (daysLeft === 0) return "Due today";
  return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
}

function countdownTone(daysLeft: number | null) {
  if (daysLeft === null) {
    return "rounded-full border px-3 py-1 text-xs text-gray-700";
  }
  if (daysLeft < 0) {
    return "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700";
  }
  if (daysLeft === 0) {
    return "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700";
  }
  if (daysLeft <= 7) {
    return "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700";
  }
  return "rounded-full border px-3 py-1 text-xs text-gray-700";
}

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

export default function AllPigsPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingPigId, setDeletingPigId] = useState<string | null>(null);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("days");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "ACTIVE" | "FEMALE" | "MALE" | "PREGNANT" | "RETURNED_TO_HEAT"
  >("ALL");

  const [form, setForm] = useState({
    tagNumber: "",
    sex: "FEMALE",
    breed: "",
  });

  useEffect(() => {
    if (!hasClientAuthState()) {
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

  async function addPig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage("");

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
      setMessage("Pig added successfully.");
      await reloadPigs();

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err: any) {
      setError(err.message ?? "Failed to add pig");
    } finally {
      setSaving(false);
    }
  }

  async function deletePig(pig: Pig) {
    const confirmed = window.confirm(
      `Delete pig #${pig.tagNumber}? This will remove its pig profile and event history.`,
    );
    if (!confirmed) return;

    try {
      setDeletingPigId(pig.id);
      setError(null);
      setMessage("");
      await apiDelete(`/pigs/${pig.id}`);
      setMessage(`Pig #${pig.tagNumber} deleted.`);
      await reloadPigs();

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err: any) {
      setError(err.message ?? "Failed to delete pig");
    } finally {
      setDeletingPigId(null);
    }
  }

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

  const dueSoonPigs = useMemo(
    () =>
      pigs.filter(
        (p) =>
          normalizePigValue(p.status) === "ACTIVE" &&
          p.farrowingDaysLeft !== null &&
          p.farrowingDaysLeft >= 0 &&
          p.farrowingDaysLeft <= 7,
      ),
    [pigs],
  );

  const filteredPigs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pigs.filter((p) => {
      const matchesSearch =
        !q ||
        p.tagNumber.toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.breed ?? "").toLowerCase().includes(q) ||
        p.sex.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q);

      let matchesFilter = true;
      const sex = normalizePigValue(p.sex);
      const status = normalizePigValue(p.status);
      const pregnancyStatus = normalizePigValue(p.pregnancyStatus);

      if (filter === "ACTIVE") {
        matchesFilter = status === "ACTIVE";
      } else if (filter === "FEMALE") {
        matchesFilter = sex === "FEMALE";
      } else if (filter === "MALE") {
        matchesFilter = sex === "MALE";
      } else if (filter === "PREGNANT") {
        matchesFilter =
          status === "ACTIVE" &&
          sex === "FEMALE" &&
          pregnancyStatus === "PREGNANT";
      } else if (filter === "RETURNED_TO_HEAT") {
        matchesFilter =
          status === "ACTIVE" &&
          sex === "FEMALE" &&
          pregnancyStatus === "RETURNED_TO_HEAT";
      }

      return matchesSearch && matchesFilter;
    });
  }, [pigs, search, filter]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">All Pigs</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Pig Register
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {me?.farmName ?? "Farm"} - {activePigs.length} active pigs -{" "}
                {pregnantPigs.length} pregnant
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/pigs")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                type="button"
              >
                Back to Pigs
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                type="button"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Pigs"
            value={String(pigs.length)}
            helper="All pigs in the register"
          />
          <SummaryCard
            label="Active Pigs"
            value={String(activePigs.length)}
            helper="Currently active pigs"
          />
          <SummaryCard
            label="Female Pigs"
            value={String(femalePigs.length)}
            helper="Active female pigs"
          />
          <SummaryCard
            label="Male Pigs"
            value={String(malePigs.length)}
            helper="Active male pigs"
          />
          <SummaryCard
            label="Due Soon"
            value={String(dueSoonPigs.length)}
            helper="Farrowing within 7 days"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Add Pig"
            subtitle="Register a new pig and its basic details."
          >
            <div data-tour="all-pigs-add-section">
              <form onSubmit={addPig} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tag Number
                  </label>
                  <input
                    value={form.tagNumber}
                    onChange={(e) =>
                      setForm({ ...form, tagNumber: e.target.value })
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter tag number"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Sex
                    </label>
                    <select
                      value={form.sex}
                      onChange={(e) => setForm({ ...form, sex: e.target.value })}
                      className="w-full rounded-xl border px-4 py-3 text-gray-900"
                    >
                      <option value="FEMALE">FEMALE</option>
                      <option value="MALE">MALE</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Breed
                    </label>
                    <select
                      value={form.breed}
                      onChange={(e) => setForm({ ...form, breed: e.target.value })}
                      className="w-full rounded-xl border px-4 py-3 text-gray-900"
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
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Birth Date
                  </label>
                  <DatePicker
                    selected={birthDate}
                    onChange={(date: Date | null) => setBirthDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select birth date"
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    maxDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Adding birth date enables age, stage, and timeline tasks.
                  </p>
                </div>

                <button
                  className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Saving..." : "Add Pig"}
                </button>
              </form>
            </div>
          </SectionCard>

          <SectionCard
            title="Quick Overview"
            subtitle="Key pregnancy and farrowing highlights."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Pregnant Pigs</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {pregnantPigs.length}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Active female pigs marked pregnant
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Farrowing Soon</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {dueSoonPigs.length}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Due within the next 7 days
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Age Display</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {ageUnit}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Based on your saved preference
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Open Pregnant View</div>
                <button
                  type="button"
                  onClick={() => router.push("/pregnant-pigs")}
                  className="mt-3 rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  View Pregnant Pigs
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Pig List"
          subtitle="View status, pregnancy progress, and farrowing countdowns."
        >
          <div data-tour="all-pigs-list-section">
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Search by tag number, breed, sex, or status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
              />

              <select
                value={filter}
                onChange={(e) =>
                  setFilter(
                    e.target.value as
                      | "ALL"
                      | "ACTIVE"
                      | "FEMALE"
                      | "MALE"
                      | "PREGNANT"
                      | "RETURNED_TO_HEAT",
                  )
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              >
                <option value="ALL">All Pigs</option>
                <option value="ACTIVE">Active</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="PREGNANT">Pregnant</option>
                <option value="RETURNED_TO_HEAT">Returned to Heat</option>
              </select>
            </div>

            {filteredPigs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-gray-500">
                No pigs added yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Tag Number
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Sex
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Breed
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Age
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Pregnancy
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Expected Farrowing
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Countdown
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPigs.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="px-3 py-3 text-gray-900">{p.tagNumber}</td>
                        <td className="px-3 py-3 text-gray-900">{p.sex}</td>
                        <td className="px-3 py-3 text-gray-900">{p.breed ?? "-"}</td>
                        <td className="px-3 py-3 text-gray-900">
                          {formatAge(p.birthDate, ageUnit)}
                        </td>
                        <td className="px-3 py-3 text-gray-900">{p.status}</td>
                        <td className="px-3 py-3 text-gray-900">
                          {pregnancyStatusLabel(p.pregnancyStatus)}
                        </td>
                        <td className="px-3 py-3 text-gray-900">
                          {p.expectedFarrowingDate
                            ? formatDate(p.expectedFarrowingDate)
                            : "-"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={countdownTone(p.farrowingDaysLeft)}>
                            {farrowingCountdownLabel(p.farrowingDaysLeft)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/pigs/${p.id}`)}
                              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                              type="button"
                            >
                              Open
                            </button>

                            <button
                              onClick={() => router.push(`/pigs/${p.id}#edit`)}
                              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                              type="button"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deletePig(p)}
                              disabled={deletingPigId === p.id}
                              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-700 hover:bg-red-700 hover:text-white disabled:opacity-60"
                              type="button"
                            >
                              {deletingPigId === p.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
