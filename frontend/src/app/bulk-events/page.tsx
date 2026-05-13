"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost, hasClientAuthState } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";

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

type PigEvent = {
  id: string;
  pigId: string;
  type: string;
  eventDate: string;
  medicine: string | null;
  dose: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
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

type BulkEditForm = {
  type: string;
  eventDate: string;
  medicine: string;
  dose: string;
  cost: string;
  notes: string;
};

type BulkEventBatch = {
  key: string;
  eventIds: string[];
  pigIds: string[];
  type: string;
  eventDate: string;
  medicine: string;
  dose: string;
  cost: number | null;
  notes: string;
};

const EVENT_TYPES = [
  "WEIGHT",
  "VACCINATION",
  "DEWORMING",
  "TRANSPORT",
  "TEETH_CLIPPING",
  "TAIL_DOCKING",
  "CASTRATION",
  "IRON_INJECTION",
  "ABORTION",
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
  if (type === "TRANSPORT") return "Transport";
  if (type === "TEETH_CLIPPING") return "Teeth Clipping";
  if (type === "TAIL_DOCKING") return "Tail Docking";
  if (type === "CASTRATION") return "Castration";
  if (type === "IRON_INJECTION") return "Iron Injection";
  if (type === "ABORTION") return "Abortion";
  if (type === "TREATMENT") return "Treatment";
  if (type === "SALE") return "Sale";
  if (type === "NOTE") return "Note";
  return type;
}

function showMedicineFields(type: string) {
  return ["VACCINATION", "DEWORMING", "TREATMENT", "IRON_INJECTION"].includes(type);
}

function showCostField(type: string) {
  return [
    "VACCINATION",
    "DEWORMING",
    "TRANSPORT",
    "TREATMENT",
    "IRON_INJECTION",
    "CASTRATION",
    "SALE",
  ].includes(type);
}

function costHelper(type: string) {
  if (type === "SALE") {
    return "For bulk sale, this is treated as total shared amount and will be split across selected pigs.";
  }
  if (["VACCINATION", "DEWORMING", "TRANSPORT", "TREATMENT", "IRON_INJECTION", "CASTRATION"].includes(type)) {
    return "For bulk events, this is treated as total shared cost and will be split across selected pigs.";
  }
  return "";
}

function toDateTimeInput(value: string | Date | null | undefined) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function BulkEventsPage() {
  const router = useRouter();

  const [pigs, setPigs] = useState<Pig[]>([]);
  const [groups, setGroups] = useState<PigGroup[]>([]);
  const [events, setEvents] = useState<PigEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingBatch, setEditingBatch] = useState<BulkEventBatch | null>(null);

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

  const [editForm, setEditForm] = useState<BulkEditForm>({
    type: "DEWORMING",
    eventDate: new Date().toISOString().slice(0, 16),
    medicine: "",
    dose: "",
    cost: "",
    notes: "",
  });

  useEffect(() => {
    if (!hasClientAuthState()) {
      router.push("/login");
      return;
    }

    loadData();
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [pigsData, groupsData, eventsData] = await Promise.all([
        apiGet<Pig[]>("/pigs"),
        apiGet<PigGroup[]>("/pig-groups"),
        apiGet<PigEvent[]>("/events"),
      ]);

      setPigs(pigsData.filter((pig) => pig.status === "ACTIVE"));
      setGroups(groupsData);
      setEvents(eventsData);
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

  const pigById = useMemo(() => {
    return new Map(activePigs.map((pig) => [pig.id, pig]));
  }, [activePigs]);

  const recentBulkEvents = useMemo(() => {
    const groupsByEvent = new Map<string, BulkEventBatch>();

    for (const event of events) {
      const eventDay = new Date(event.eventDate).toISOString();
      const key = [
        event.type,
        eventDay,
        event.medicine ?? "",
        event.dose ?? "",
        event.cost ?? "",
        event.notes ?? "",
      ].join("|");

      const existing = groupsByEvent.get(key);

      if (existing) {
        existing.eventIds.push(event.id);
        existing.pigIds.push(event.pigId);
        continue;
      }

      groupsByEvent.set(key, {
        key,
        eventIds: [event.id],
        pigIds: [event.pigId],
        type: event.type,
        eventDate: event.eventDate,
        medicine: event.medicine ?? "",
        dose: event.dose ?? "",
        cost: event.cost,
        notes: event.notes ?? "",
      });
    }

    return Array.from(groupsByEvent.values())
      .filter((batch) => batch.eventIds.length > 1)
      .sort(
        (a, b) =>
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
      )
      .slice(0, 20);
  }, [events]);

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
      setEditingBatch(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create bulk event");
    } finally {
      setSaving(false);
    }
  }

  function startEditingBatch(batch: BulkEventBatch) {
    setError(null);
    setMessage("");
    setEditingBatch(batch);
    setEditForm({
      type: batch.type,
      eventDate: toDateTimeInput(batch.eventDate),
      medicine: batch.medicine,
      dose: batch.dose,
      cost:
        batch.cost !== null
          ? Number((batch.cost * batch.eventIds.length).toFixed(2)).toString()
          : "",
      notes: batch.notes,
    });
  }

  async function submitBulkEventUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingBatch) return;

    try {
      setUpdating(true);
      setError(null);
      setMessage("");

      const payload: any = {
        eventIds: editingBatch.eventIds,
        type: editForm.type,
        eventDate: editForm.eventDate || undefined,
        medicine: showMedicineFields(editForm.type) ? editForm.medicine || null : null,
        dose: showMedicineFields(editForm.type) ? editForm.dose || null : null,
        cost: showCostField(editForm.type)
          ? editForm.cost
            ? Number(editForm.cost)
            : null
          : null,
        notes: editForm.notes || null,
      };

      const result = await apiPatch<any>("/events/bulk", payload);

      setMessage(
        result?.message ??
          `Bulk ${eventLabel(editForm.type).toLowerCase()} updated successfully.`,
      );
      setEditingBatch(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update bulk event");
    } finally {
      setUpdating(false);
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
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
              >
                Pig Groups
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
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
                    setForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                      dose: e.target.value === "IRON_INJECTION" ? "2ml" : prev.dose,
                    }))
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

        <SectionCard
          title="Edit Bulk Events"
          subtitle="Update recent bulk event batches without editing each pig one by one."
        >
          {recentBulkEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-500">
              No editable bulk event batches found yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recentBulkEvents.map((batch) => {
                const isEditing = editingBatch?.key === batch.key;
                const totalCost =
                  batch.cost !== null
                    ? Number((batch.cost * batch.eventIds.length).toFixed(2))
                    : null;
                const pigLabels = batch.pigIds
                  .map((pigId) => pigById.get(pigId)?.tagNumber ?? "Unknown")
                  .join(", ");

                return (
                  <div key={batch.key} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-base font-semibold text-gray-900">
                          {eventLabel(batch.type)}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {formatDateTime(batch.eventDate)} • {batch.eventIds.length} pig(s)
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          {pigLabels}
                        </div>
                        {totalCost !== null ? (
                          <div className="mt-2 text-sm text-gray-600">
                            Total shared cost: KES {totalCost.toLocaleString()}
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          isEditing ? setEditingBatch(null) : startEditingBatch(batch)
                        }
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                    </div>

                    {isEditing ? (
                      <form onSubmit={submitBulkEventUpdate} className="mt-5 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Event Type
                            </label>
                            <select
                              value={editForm.type}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  type: e.target.value,
                                  dose:
                                    e.target.value === "IRON_INJECTION"
                                      ? "2ml"
                                      : prev.dose,
                                }))
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
                              value={editForm.eventDate}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  eventDate: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border px-4 py-3 text-gray-900"
                              required
                            />
                          </div>
                        </div>

                        {showMedicineFields(editForm.type) && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Medicine
                              </label>
                              <input
                                type="text"
                                value={editForm.medicine}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    medicine: e.target.value,
                                  }))
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
                                value={editForm.dose}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    dose: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                              />
                            </div>
                          </div>
                        )}

                        {showCostField(editForm.type) && (
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              {editForm.type === "SALE"
                                ? "Total Sale Amount"
                                : "Total Shared Cost"}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editForm.cost}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  cost: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              {costHelper(editForm.type)}
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            className="min-h-[100px] w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={updating}
                            className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                          >
                            {updating ? "Updating..." : "Update Bulk Event"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingBatch(null)}
                            className="rounded-xl border px-4 py-3 font-medium text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
