"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type Pig = {
  id: string;
  tagNumber: string;
  sex: string;
  breed: string | null;
  status: string;
  pigGroupId?: string | null;
};

type PigGroup = {
  id: string;
  name: string;
  description: string | null;
  pigs: Pig[];
};

type BulkEventForm = {
  type: string;
  pigGroupId: string;
  pigIds: string[];
  eventDate: string;
  medicine: string;
  dose: string;
  cost: string;
  notes: string;
};

const EVENT_TYPES = [
  "WEIGHT",
  "VACCINATION",
  "DEWORMING",
  "TREATMENT",
  "SALE",
  "NOTE",
];

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

function eventLabel(type: string) {
  if (type === "WEIGHT") return "Weight";
  if (type === "VACCINATION") return "Vaccination";
  if (type === "DEWORMING") return "Deworming";
  if (type === "TREATMENT") return "Treatment";
  if (type === "SALE") return "Sale";
  if (type === "NOTE") return "Note";
  return type;
}

function showMedicineFields(type: string) {
  return ["VACCINATION", "DEWORMING", "TREATMENT"].includes(type);
}

function showCostField(type: string) {
  return ["VACCINATION", "DEWORMING", "TREATMENT", "SALE"].includes(type);
}

function costHelper(type: string) {
  if (type === "SALE") {
    return "For bulk sale, this is treated as total shared amount and will be split across selected pigs.";
  }
  if (["VACCINATION", "DEWORMING", "TREATMENT"].includes(type)) {
    return "For bulk events, this is treated as total shared cost and will be split across selected pigs.";
  }
  return "";
}

export default function BulkEventsPage() {
  const router = useRouter();

  const [pigs, setPigs] = useState<Pig[]>([]);
  const [groups, setGroups] = useState<PigGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState<BulkEventForm>({
    type: "DEWORMING",
    pigGroupId: "",
    pigIds: [],
    eventDate: new Date().toISOString().slice(0, 16),
    medicine: "",
    dose: "",
    cost: "",
    notes: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    loadData();
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [pigsData, groupsData] = await Promise.all([
        apiGet<Pig[]>("/pigs"),
        apiGet<PigGroup[]>("/pig-groups"),
      ]);

      setPigs(pigsData.filter((pig) => pig.status === "ACTIVE"));
      setGroups(groupsData);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load bulk event data");
    } finally {
      setLoading(false);
    }
  }

  const activePigs = useMemo(() => pigs.filter((pig) => pig.status === "ACTIVE"), [pigs]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === form.pigGroupId) ?? null,
    [groups, form.pigGroupId],
  );

  const selectedPigCount = useMemo(() => {
    if (form.pigGroupId && selectedGroup) {
      return selectedGroup.pigs.length;
    }
    return form.pigIds.length;
  }, [form.pigGroupId, form.pigIds, selectedGroup]);

  const groupedPigIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of groups) {
      for (const pig of group.pigs) {
        ids.add(pig.id);
      }
    }
    return ids;
  }, [groups]);

  const availablePigs = useMemo(() => {
    return activePigs.filter((pig) => !groupedPigIds.has(pig.id));
  }, [activePigs, groupedPigIds]);

  function togglePig(pigId: string) {
    setForm((prev) => ({
      ...prev,
      pigIds: prev.pigIds.includes(pigId)
        ? prev.pigIds.filter((id) => id !== pigId)
        : [...prev.pigIds, pigId],
    }));
  }

  function resetForm() {
    setForm({
      type: "DEWORMING",
      pigGroupId: "",
      pigIds: [],
      eventDate: new Date().toISOString().slice(0, 16),
      medicine: "",
      dose: "",
      cost: "",
      notes: "",
    });
  }

  async function submitBulkEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.pigGroupId && form.pigIds.length === 0) {
      setError("Select a pig group or choose at least one pig.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage("");

      const payload: any = {
        type: form.type,
        eventDate: form.eventDate || undefined,
        pigGroupId: form.pigGroupId || undefined,
        pigIds: form.pigGroupId ? undefined : form.pigIds,
        medicine: form.medicine || undefined,
        dose: form.dose || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        notes: form.notes || undefined,
      };

      const result = await apiPost<any>("/events/bulk", payload);

      setMessage(
        result?.message ??
          `Bulk ${eventLabel(form.type).toLowerCase()} recorded successfully.`,
      );

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create bulk event");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading bulk events...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Bulk Events</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Record Bulk Events
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Record one event for multiple pigs or an entire pig group at once.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/pig-groups")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
              >
                Pig Groups
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
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
          <SummaryCard
            label="Active Pigs"
            value={String(activePigs.length)}
            helper="Available farm pigs"
          />
          <SummaryCard
            label="Pig Groups"
            value={String(groups.length)}
            helper="Groups available for bulk actions"
          />
          <SummaryCard
            label="Ungrouped Active Pigs"
            value={String(availablePigs.length)}
            helper="Can be selected individually"
          />
          <SummaryCard
            label="Selected"
            value={String(selectedPigCount)}
            helper="Current bulk event target"
          />
        </div>

        <SectionCard
          title="Bulk Event Form"
          subtitle="Choose an event type, then apply it to a group or selected pigs."
        >
          <form onSubmit={submitBulkEvent} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {eventLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, eventDate: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  required
                />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Option 1: Use Pig Group
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Choose a group to apply this event to all pigs in that group.
                </p>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Pig Group
                  </label>
                  <select
                    value={form.pigGroupId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pigGroupId: e.target.value,
                        pigIds: e.target.value ? [] : prev.pigIds,
                      }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  >
                    <option value="">Select group (optional)</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.pigs.length} pig(s))
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGroup ? (
                  <div className="mt-4 rounded-xl border p-3 text-sm text-gray-700">
                    This event will apply to{" "}
                    <span className="font-semibold">{selectedGroup.pigs.length}</span>{" "}
                    pig(s) in <span className="font-semibold">{selectedGroup.name}</span>.
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border p-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Option 2: Select Individual Pigs
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Use this when you do not want to target a whole group.
                </p>

                <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto rounded-xl border p-3">
                  {availablePigs.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No ungrouped active pigs available.
                    </div>
                  ) : (
                    availablePigs.map((pig) => (
                      <label
                        key={pig.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          form.pigGroupId ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.pigIds.includes(pig.id)}
                          onChange={() => togglePig(pig.id)}
                          disabled={!!form.pigGroupId}
                        />
                        <span className="text-sm text-gray-900">
                          {pig.tagNumber} • {pig.sex}
                          {pig.breed ? ` • ${pig.breed}` : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {showMedicineFields(form.type) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Medicine
                  </label>
                  <input
                    type="text"
                    placeholder="Enter medicine used"
                    value={form.medicine}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, medicine: e.target.value }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Dose
                  </label>
                  <input
                    type="text"
                    placeholder="Enter dose"
                    value={form.dose}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dose: e.target.value }))
                    }
                    className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>
            )}

            {showCostField(form.type) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {form.type === "SALE" ? "Total Sale Amount" : "Total Shared Cost"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    form.type === "SALE"
                      ? "Enter total sale amount"
                      : "Enter total shared cost"
                  }
                  value={form.cost}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cost: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">{costHelper(form.type)}</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                placeholder="Add notes for this bulk event"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="min-h-[120px] w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Bulk Event"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-4 py-3 font-medium text-gray-900"
              >
                Reset Form
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}