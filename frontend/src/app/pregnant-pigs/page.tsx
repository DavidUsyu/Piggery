"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, hasClientAuthState } from "@/lib/api";
import { formatDate } from "@/lib/dates";
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

type PregnantPigEditForm = {
  tagNumber: string;
  name: string;
  breed: string;
  birthDate: string;
  pregnancyStatus: string;
};

function pregnancyStatusLabel(status: string) {
  if (status === "NOT_PREGNANT") return "Not Pregnant";
  if (status === "PREGNANT") return "Pregnant";
  if (status === "RETURNED_TO_HEAT") return "Returned to Heat";
  return status;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function farrowingCountdownLabel(daysLeft: number | null) {
  if (daysLeft === null) return "-";
  if (daysLeft > 0) return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  if (daysLeft === 0) return "Due today";
  return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
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

function countdownTone(daysLeft: number | null) {
  if (daysLeft === null) return "rounded-full border px-3 py-1 text-xs text-gray-700";
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

export default function PregnantPigsPage() {
  const router = useRouter();

  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingPigId, setDeletingPigId] = useState<string | null>(null);
  const [editingPig, setEditingPig] = useState<Pig | null>(null);
  const [search, setSearch] = useState("");
  const [editForm, setEditForm] = useState<PregnantPigEditForm>({
    tagNumber: "",
    name: "",
    breed: "",
    birthDate: "",
    pregnancyStatus: "PREGNANT",
  });

  useEffect(() => {
    if (!hasClientAuthState()) {
      router.push("/login");
      return;
    }

    loadPregnantPigs();
  }, [router]);

  async function loadPregnantPigs() {
    try {
      setLoading(true);
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
      setError(err?.message ?? "Failed to load pregnant pigs");
    } finally {
      setLoading(false);
    }
  }

  function startEditing(pig: Pig) {
    setError(null);
    setMessage("");
    setEditingPig(pig);
    setEditForm({
      tagNumber: pig.tagNumber,
      name: pig.name ?? "",
      breed: pig.breed ?? "",
      birthDate: toDateInput(pig.birthDate),
      pregnancyStatus: pig.pregnancyStatus,
    });
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingPig) return;

    try {
      setSaving(true);
      setError(null);
      setMessage("");

      await apiPatch(`/pigs/${editingPig.id}`, {
        tagNumber: editForm.tagNumber,
        name: editForm.name || null,
        breed: editForm.breed || null,
        birthDate: editForm.birthDate || null,
        pregnancyStatus: editForm.pregnancyStatus,
      });

      setMessage(`Pig #${editForm.tagNumber} updated.`);
      setEditingPig(null);
      await loadPregnantPigs();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update pregnant pig");
    } finally {
      setSaving(false);
    }
  }

  async function deletePig(pig: Pig) {
    const confirmed = window.confirm(
      `Delete pregnant pig #${pig.tagNumber}? This will remove its pig profile and event history.`,
    );

    if (!confirmed) return;

    try {
      setDeletingPigId(pig.id);
      setError(null);
      setMessage("");

      await apiDelete(`/pigs/${pig.id}`);

      setMessage(`Pig #${pig.tagNumber} deleted.`);
      setEditingPig((current) => (current?.id === pig.id ? null : current));
      await loadPregnantPigs();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete pregnant pig");
    } finally {
      setDeletingPigId(null);
    }
  }

  const filteredPigs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pigs.filter((p) => {
      if (!q) return true;

      return (
        p.tagNumber.toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.breed ?? "").toLowerCase().includes(q)
      );
    });
  }, [pigs, search]);

  const dueSoonCount = useMemo(
    () =>
      pigs.filter(
        (p) => p.farrowingDaysLeft !== null && p.farrowingDaysLeft >= 0 && p.farrowingDaysLeft <= 7,
      ).length,
    [pigs],
  );

  const overdueCount = useMemo(
    () =>
      pigs.filter(
        (p) => p.farrowingDaysLeft !== null && p.farrowingDaysLeft < 0,
      ).length,
    [pigs],
  );

  const withExpectedDateCount = useMemo(
    () => pigs.filter((p) => !!p.expectedFarrowingDate).length,
    [pigs],
  );

  if (loading) {
    return <div className="p-6">Loading pregnant pigs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Pregnant Pigs</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Pregnant Pig Overview
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Track active female pigs currently marked as pregnant and monitor expected farrowing.
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
                Dashboard
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Pregnant Pigs" value={String(pigs.length)} helper="Active female pigs marked pregnant" />
          <SummaryCard label="Due Soon" value={String(dueSoonCount)} helper="Expected farrowing within 7 days" />
          <SummaryCard label="Overdue" value={String(overdueCount)} helper="Expected farrowing date already passed" />
          <SummaryCard label="With Expected Date" value={String(withExpectedDateCount)} helper="Pregnant pigs with farrowing date recorded" />
        </div>

        <SectionCard title="Search Pregnant Pigs" subtitle="Find a pregnant pig by tag number, name, or breed.">
          <input
            type="text"
            placeholder="Search by tag number, name, or breed"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
          />
        </SectionCard>

        {editingPig ? (
          <SectionCard
            title={`Edit Pig #${editingPig.tagNumber}`}
            subtitle="Update this pregnant pig record. Changing pregnancy status away from Pregnant removes it from this page."
          >
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tag Number
                  </label>
                  <input
                    value={editForm.tagNumber}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tagNumber: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Breed
                  </label>
                  <input
                    value={editForm.breed}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, breed: e.target.value }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={editForm.birthDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        birthDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Pregnancy Status
                  </label>
                  <select
                    value={editForm.pregnancyStatus}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        pregnancyStatus: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  >
                    <option value="PREGNANT">Pregnant</option>
                    <option value="NOT_PREGNANT">Not Pregnant</option>
                    <option value="RETURNED_TO_HEAT">Returned to Heat</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingPig(null)}
                  className="rounded-xl border px-4 py-3 font-medium text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        <SectionCard title="Pregnancy Tracking" subtitle={`${filteredPigs.length} pregnant pig${filteredPigs.length === 1 ? "" : "s"} found`}>
          {filteredPigs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-gray-500">
              No pregnant pigs found.
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredPigs.map((p) => (
                  <div key={p.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-gray-900">
                          #{p.tagNumber}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {p.name ?? "No name"} - {p.breed ?? "No breed"}
                        </div>
                      </div>
                      <span className={countdownTone(p.farrowingDaysLeft)}>
                        {farrowingCountdownLabel(p.farrowingDaysLeft)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-700">
                      <div>
                        Pregnancy: {pregnancyStatusLabel(p.pregnancyStatus)}
                      </div>
                      <div>
                        Expected Farrowing:{" "}
                        {p.expectedFarrowingDate
                          ? formatDate(p.expectedFarrowingDate)
                          : "-"}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        onClick={() => router.push(`/pigs/${p.id}`)}
                        className="min-h-11 rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
                        type="button"
                      >
                        Open
                      </button>

                      <button
                        onClick={() => startEditing(p)}
                        className="min-h-11 rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deletePig(p)}
                        disabled={deletingPigId === p.id}
                        className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
                        type="button"
                      >
                        {deletingPigId === p.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[950px] w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Tag Number</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Breed</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Pregnancy Status</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Expected Farrowing</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Countdown</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPigs.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="px-3 py-3 text-gray-900">{p.tagNumber}</td>
                      <td className="px-3 py-3 text-gray-900">{p.name ?? "-"}</td>
                      <td className="px-3 py-3 text-gray-900">{p.breed ?? "-"}</td>
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
                            onClick={() => startEditing(p)}
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
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
