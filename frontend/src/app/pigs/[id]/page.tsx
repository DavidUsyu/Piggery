"use client";
import { getAgeUnit, type AgeUnit } from "@/lib/preferences";
function taskDisplayName(taskType: string) {
  if (taskType === "WEIGHT_CHECK") return "Weight Check";
  if (taskType === "VACCINATION") return "Vaccination";
  if (taskType === "DEWORMING") return "Deworming";
  if (taskType === "WEANING") return "Weaning";
  if (taskType === "PREGNANCY_CHECK") return "Pregnancy Check";
  if (taskType === "FARROWING_EXPECTED") return "Expected Farrowing";
  if (taskType === "REBREED") return "Record New Breeding";
  return taskType;
}
function pregnancyStatusLabel(status: string) {
  if (status === "NOT_PREGNANT") return "Not Pregnant";
  if (status === "PREGNANT") return "Pregnant";
  if (status === "RETURNED_TO_HEAT") return "Returned to Heat";
  return status;
}

function formatTimelineAge(ageDays: number, unit: AgeUnit) {
  if (unit === "days") {
    return `${ageDays} days`;
  }

  const ageMonths = Math.floor(ageDays / 30);
  return `${ageMonths} month${ageMonths === 1 ? "" : "s"}`;
}


import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Timeline = {
  pigId: string;
  tagNumber: string;
  sex: string;
  status: string;
  pregnancyStatus: string;
  expectedFarrowingDate: string | null;
  farrowingDaysLeft: number | null;
  stage: string;
  ageDays: number;
  lastWeight: {
    weightKg: number | null;
    eventDate: string;
  } | null;
  recommendations: string[];
};

type PigEvent = {
  id: string;
  type: string;
  eventDate: string;
  weightKg: number | null;
  medicine: string | null;
  dose: string | null;
  cost: number | null;
  notes: string | null;
  boarId: string | null;
  pigletsBorn: number | null;
  stillBorn: number | null;
  pregnancyCheckResult: string | null;
};

type PigTask = {
  pigId: string;
  tagNumber: string;
  task: string;
  dueDate: string;
  daysLeft: number;
  status: string;
  reason: string;
};

export default function PigProfilePage() {
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("days");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    setAgeUnit(getAgeUnit());
  }, []);

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [events, setEvents] = useState<PigEvent[]>([]);
  const [tasks, setTasks] = useState<PigTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState("");

  const [form, setForm] = useState({
    type: "WEIGHT",
    eventDate: new Date().toISOString().slice(0, 16),
    weightKg: "",
    medicine: "",
    dose: "",
    cost: "",
    notes: "",
    boarId: "",
    pigletsBorn: "",
    stillBorn: "",
    pregnancyCheckResult: "",
  });

  const weightData = (() => {
    const weightEvents = [...events]
      .filter((e) => e.type === "WEIGHT" && e.weightKg !== null)
      .sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
      );

    const latestPerDay = new Map<
      string,
      { date: string; fullDate: string; weight: number | null }
    >();

    for (const e of weightEvents) {
      const d = new Date(e.eventDate);
      const dayKey = d.toISOString().slice(0, 10);

      latestPerDay.set(dayKey, {
        date: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        fullDate: d.toISOString(),
        weight: e.weightKg,
      });
    }

    return Array.from(latestPerDay.values());
  })();

  const growthAnalysis = (() => {
    if (weightData.length < 2) {
      return {
        hasEnoughData: false,
        totalGain: 0,
        daysBetween: 0,
        avgDailyGain: 0,
        status: "Insufficient data",
        insight:
          "Add at least two weight records on different days to analyze growth.",
      };
    }

    const first = weightData[0];
    const last = weightData[weightData.length - 1];

    const firstDate = new Date(first.fullDate);
    const lastDate = new Date(last.fullDate);

    const daysBetween = Math.max(
      1,
      Math.floor(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const totalGain = (last.weight ?? 0) - (first.weight ?? 0);
    const avgDailyGain = totalGain / daysBetween;

    let status = "Normal";
    let insight = "Weight is increasing steadily.";

    if (avgDailyGain < 0) {
      status = "Declining";
      insight =
        "Weight is decreasing. Check for illness, poor feed intake, or incorrect records.";
    } else if (avgDailyGain < 0.2) {
      status = "Below expected";
      insight =
        "Growth is slower than expected. Review feed quality, deworming, vaccination, and health records.";
    } else if (avgDailyGain <= 0.5) {
      status = "Normal";
      insight = "Growth is within a healthy range for routine monitoring.";
    } else {
      status = "Excellent";
      insight = "Growth is strong. Maintain current feeding and health practices.";
    }

    return {
      hasEnoughData: true,
      totalGain,
      daysBetween,
      avgDailyGain,
      status,
      insight,
    };
  })();

  function resetEventForm() {
    setEditingEventId(null);
    setForm({
      type: "WEIGHT",
      eventDate: new Date().toISOString().slice(0, 16),
      weightKg: "",
      medicine: "",
      dose: "",
      cost: "",
      notes: "",
      boarId: "",
      pigletsBorn: "",
      stillBorn: "",
      pregnancyCheckResult: "",
    });
  }

  function cancelEdit() {
    resetEventForm();
  }

  function startEditEvent(e: PigEvent) {
    setEditingEventId(e.id);
    setForm({
      type: e.type,
      eventDate: new Date(e.eventDate).toISOString().slice(0, 16),
      weightKg: e.weightKg !== null ? String(e.weightKg) : "",
      medicine: e.medicine ?? "",
      dose: e.dose ?? "",
      cost: e.cost !== null ? String(e.cost) : "",
      notes: e.notes ?? "",
      boarId: e.boarId ?? "",
      pigletsBorn: e.pigletsBorn !== null ? String(e.pigletsBorn) : "",
      stillBorn: e.stillBorn !== null ? String(e.stillBorn) : "",
      pregnancyCheckResult: e.pregnancyCheckResult ?? "",
    });
  }

  function showWeightField(type: string) {
    return type === "WEIGHT";
  }

  function showMedicationFields(type: string) {
    return ["VACCINATION", "DEWORMING", "TREATMENT"].includes(type);
  }

  function showBreedingFields(type: string) {
    return type === "BREEDING";
  }

  function showFarrowingFields(type: string) {
    return type === "FARROWING";
  }

  function showNotesField(_type: string) {
    return true;
  }

  function taskRequiresForm(taskType: string) {
  return [
    "WEIGHT_CHECK",
    "VACCINATION",
    "DEWORMING",
    "PREGNANCY_CHECK",
    "REBREED",
  ].includes(taskType);
}

  function taskButtonLabel(taskType: string) {
    if (taskType === "WEIGHT_CHECK") return "Record Weight";
    if (taskType === "VACCINATION") return "Record Vaccination";
    if (taskType === "DEWORMING") return "Record Deworming";
    if (taskType === "PREGNANCY_CHECK") return "Record Pregnancy Check";
    if (taskType === "REBREED") return "Record Breeding";
    return "Complete Task";
  }

  function taskDisplayName(taskType: string) {
    if (taskType === "WEIGHT_CHECK") return "Weight Check";
    if (taskType === "VACCINATION") return "Vaccination";
    if (taskType === "DEWORMING") return "Deworming";
    if (taskType === "WEANING") return "Weaning";
    if (taskType === "PREGNANCY_CHECK") return "Pregnancy Check";
    if (taskType === "FARROWING_EXPECTED") return "Expected Farrowing";
    return taskType;
  }

  function startTaskForm(taskType: string) {

    let eventType = taskType;

    if (taskType === "WEIGHT_CHECK") {
      eventType = "WEIGHT";
    }

    if (taskType === "REBREED") {
      eventType = "BREEDING";
    }

    setEditingEventId(null);
    setForm({
      type: eventType,
      eventDate: new Date().toISOString().slice(0, 16),
      weightKg: "",
      medicine: "",
      dose: "",
      cost: "",
      notes:
        taskType === "WEIGHT_CHECK"
          ? "Created from weight check task"
          : taskType === "REBREED"
            ? "Created because the pig returned to heat. Record a new breeding event."
            : `Created from task: ${taskType}`,
      boarId: "",
      pigletsBorn: "",
      stillBorn: "",
      pregnancyCheckResult: "",
    });

    const formSection = document.getElementById("add-event-form");
    formSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadPigData() {
    try {
      setError(null);

      const [timelineRes, eventsRes, tasksData] = await Promise.all([
        apiGet<Timeline>(`/pigs/${id}/timeline`),
        apiGet<PigEvent[]>(`/events?pigId=${id}`),
        apiGet<PigTask[]>("/tasks/due"),
      ]);

      setTimeline(timelineRes);
      setEvents(eventsRes);
      setTasks(tasksData.filter((t) => t.pigId === id));
    } catch (err: any) {
      setError(err.message ?? "Failed to load pig profile");
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      pigId: id,
      type: form.type,
      eventDate: form.eventDate || undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      medicine: form.medicine || undefined,
      dose: form.dose || undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      notes: form.notes || undefined,
      boarId: form.boarId || undefined,
      pigletsBorn: form.pigletsBorn ? Number(form.pigletsBorn) : undefined,
      stillBorn: form.stillBorn ? Number(form.stillBorn) : undefined,
      pregnancyCheckResult: form.pregnancyCheckResult || undefined,
    };

    try {
      if (editingEventId) {
        await apiPatch(`/events/${editingEventId}`, payload);
      } else {
        await apiPost("/events", payload);
      }

      cancelEdit();
      await loadPigData();
    } catch (err: any) {
      setError(err.message ?? "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event?",
    );
    if (!confirmed) return;

    try {
      setError(null);
      await apiDelete(`/events/${eventId}`);
      await loadPigData();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete event");
    }
  }

  async function completeTask(taskType: string) {
    try {
      setError(null);

      await apiPost("/events", {
        pigId: id,
        type: taskType,
        eventDate: new Date().toISOString(),
        notes: `Created automatically by completing task: ${taskType}`,
      });

      await loadPigData();
    } catch (err: any) {
      setError(err.message ?? "Failed to complete task");
    }
  }

  async function updatePigStatus(status: "SOLD" | "DEAD" | "CONSUMED") {
    const confirmed = window.confirm(
      `Are you sure you want to mark this pig as ${status}?`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      await apiPatch(`/pigs/${id}/status`, {
        status,
        notes: statusNotes || undefined,
      });

      setStatusNotes("");
      await loadPigData();
    } catch (err: any) {
      setError(err.message ?? "Failed to update pig status");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
  }, [router]);

  useEffect(() => {
    if (id) loadPigData();
  }, [id]);

  return (
    <div className="min-h-screen p-6">
      <div className="mt-4 flex justify-end">
        <select
          className="rounded-xl border p-2 text-sm"
          value={ageUnit}
          onChange={(e) => setAgeUnit(e.target.value as "days" | "months")}
        >
          <option value="days">Show age in days</option>
          <option value="months">Show age in months</option>
        </select>
      </div>
      <div className="max-w-5xl mx-auto">
        <button
          className="rounded-xl border px-4 py-2 mb-4"
          onClick={() => router.push("/dashboard")}
        >
          Back
        </button>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {timeline && (
          <>
            <div className="rounded-2xl border p-6">
              <h1 className="text-2xl font-semibold">{timeline.tagNumber}</h1>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <InfoCard label="Stage" value={timeline.stage} />
                <InfoCard
                  label="Age"
                  value={formatTimelineAge(timeline.ageDays, ageUnit)}
                />
                <InfoCard label="Status" value={timeline.status} />
                <InfoCard
                  label="Pregnancy"
                  value={pregnancyStatusLabel(timeline.pregnancyStatus)}
                />
                <InfoCard
                  label="Last Weight"
                  value={
                    timeline.lastWeight?.weightKg
                      ? `${timeline.lastWeight.weightKg} kg`
                      : "No weight yet"
                  }
                />
              </div>
            </div>

            <section className="mt-6 rounded-2xl border p-4">
              <h2 className="text-lg font-semibold">Outcome</h2>

              <p className="mt-2 text-sm text-gray-500">
                Use this when the pig leaves active production.
              </p>

              <textarea
                className="mt-4 w-full rounded-xl border p-3"
                placeholder="Optional notes (sale details, cause of death, home consumption notes)"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-xl border px-4 py-3 hover:bg-white/5"
                  onClick={() => updatePigStatus("SOLD")}
                >
                  Mark as Sold
                </button>

                <button
                  className="rounded-xl border px-4 py-3 hover:bg-white/5"
                  onClick={() => updatePigStatus("DEAD")}
                >
                  Mark as Dead
                </button>

                <button
                  className="rounded-xl border px-4 py-3 hover:bg-white/5"
                  onClick={() => updatePigStatus("CONSUMED")}
                >
                  Mark as Consumed
                </button>
              </div>
            </section>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {timeline.status === "ACTIVE" && (
                <section className="rounded-2xl border p-4">
                  <h2 className="text-lg font-semibold">Recommendations</h2>
                  <div className="mt-3 space-y-2">
                    {timeline.recommendations.length === 0 ? (
                      <p className="text-sm text-gray-500">No recommendations.</p>
                    ) : (
                      timeline.recommendations.map((r, i) => (
                        <div key={i} className="rounded-xl border p-3 text-sm">
                          {r}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              <section id="add-event-form" className="rounded-2xl border p-4">
                {timeline.status !== "ACTIVE" && (
                  <div className="text-sm text-red-400 mb-3">
                    This pig is no longer active. You cannot add new events.
                  </div>
                )}

                <h2 className="text-lg font-semibold">Add Event</h2>

                <form
                  onSubmit={addEvent}
                  className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  <select
                    className="rounded-xl border p-3"
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value,
                        weightKg: "",
                        medicine: "",
                        dose: "",
                        cost: "",
                        boarId: "",
                        pigletsBorn: "",
                        stillBorn: "",
                        pregnancyCheckResult: "",
                      })
                    }
                  >
                    <option value="WEIGHT">WEIGHT</option>
                    <option value="VACCINATION">VACCINATION</option>
                    <option value="DEWORMING">DEWORMING</option>

                    {timeline?.sex === "FEMALE" && (
                      <>
                        <option value="BREEDING">BREEDING</option>
                        <option value="PREGNANCY_CHECK">PREGNANCY_CHECK</option>
                        <option value="FARROWING">FARROWING</option>
                      </>
                    )}

                    <option value="WEANING">WEANING</option>
                    <option value="TREATMENT">TREATMENT</option>
                    <option value="NOTE">NOTE</option>
                  </select>

                  {form.type === "PREGNANCY_CHECK" && (
                    <select
                      className="rounded-xl border p-3"
                      value={form.pregnancyCheckResult}
                      onChange={(e) =>
                        setForm({ ...form, pregnancyCheckResult: e.target.value })
                      }
                    >
                      <option value="">Select result</option>
                      <option value="PREGNANT">Pregnant</option>
                      <option value="RETURNED_TO_HEAT">Returned to heat</option>
                    </select>
                  )}

                  <input
                    className="rounded-xl border p-3"
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) =>
                      setForm({ ...form, eventDate: e.target.value })
                    }
                  />

                  {showWeightField(form.type) && (
                    <input
                      className="rounded-xl border p-3"
                      type="number"
                      step="0.1"
                      placeholder="Weight (kg)"
                      value={form.weightKg}
                      onChange={(e) =>
                        setForm({ ...form, weightKg: e.target.value })
                      }
                    />
                  )}

                  {showMedicationFields(form.type) && (
                    <>
                      <input
                        className="rounded-xl border p-3"
                        placeholder="Medicine"
                        value={form.medicine}
                        onChange={(e) =>
                          setForm({ ...form, medicine: e.target.value })
                        }
                      />

                      <input
                        className="rounded-xl border p-3"
                        placeholder="Dose"
                        value={form.dose}
                        onChange={(e) =>
                          setForm({ ...form, dose: e.target.value })
                        }
                      />

                      <input
                        className="rounded-xl border p-3"
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={form.cost}
                        onChange={(e) =>
                          setForm({ ...form, cost: e.target.value })
                        }
                      />
                    </>
                  )}

                  {showBreedingFields(form.type) && (
                    <input
                      className="rounded-xl border p-3"
                      placeholder="Boar ID (optional)"
                      value={form.boarId}
                      onChange={(e) =>
                        setForm({ ...form, boarId: e.target.value })
                      }
                    />
                  )}

                  {showFarrowingFields(form.type) && (
                    <>
                      <input
                        className="rounded-xl border p-3"
                        type="number"
                        placeholder="Piglets born"
                        value={form.pigletsBorn}
                        onChange={(e) =>
                          setForm({ ...form, pigletsBorn: e.target.value })
                        }
                      />

                      <input
                        className="rounded-xl border p-3"
                        type="number"
                        placeholder="Stillborn"
                        value={form.stillBorn}
                        onChange={(e) =>
                          setForm({ ...form, stillBorn: e.target.value })
                        }
                      />
                    </>
                  )}

                  {showNotesField(form.type) && (
                    <textarea
                      className="rounded-xl border p-3 md:col-span-2"
                      placeholder="Notes"
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      disabled={saving || timeline.status !== "ACTIVE"}
                      className="rounded-xl bg-black text-white p-3 disabled:opacity-60"
                    >
                      {saving
                        ? "Saving..."
                        : editingEventId
                          ? "Update Event"
                          : "Add Event"}
                    </button>

                    {editingEventId && (
                      <button
                        type="button"
                        className="rounded-xl border px-4 py-3"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border p-4">
                <h2 className="text-lg font-semibold">Events</h2>

                <div className="mt-3 space-y-2">
                  {events.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No events recorded.
                    </p>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{e.type}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(e.eventDate).toLocaleString()}
                            </div>

                            {e.weightKg !== null && (
                              <div className="text-sm mt-1">
                                Weight: {e.weightKg} kg
                              </div>
                            )}

                            {e.medicine && (
                              <div className="text-sm mt-1">
                                Medicine: {e.medicine}
                              </div>
                            )}

                            {e.dose && (
                              <div className="text-sm mt-1">
                                Dose: {e.dose}
                              </div>
                            )}

                            {e.cost !== null && (
                              <div className="text-sm mt-1">Cost: {e.cost}</div>
                            )}

                            {e.boarId && (
                              <div className="text-sm mt-1">
                                Boar ID: {e.boarId}
                              </div>
                            )}

                            {e.pregnancyCheckResult && (
                              <div className="text-sm mt-1">
                                Result: {pregnancyStatusLabel(e.pregnancyCheckResult)}
                              </div>
                            )}

                            {e.pigletsBorn !== null && (
                              <div className="text-sm mt-1">
                                Piglets Born: {e.pigletsBorn}
                              </div>
                            )}

                            {e.stillBorn !== null && (
                              <div className="text-sm mt-1">
                                Stillborn: {e.stillBorn}
                              </div>
                            )}

                            {e.notes && (
                              <div className="text-sm mt-1">
                                Notes: {e.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              className="rounded-xl border px-3 py-2 text-sm hover:bg-white/5"
                              onClick={() => startEditEvent(e)}
                            >
                              Edit
                            </button>

                            <button
                              className="rounded-xl border px-3 py-2 text-sm hover:bg-white/5"
                              onClick={() => deleteEvent(e.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border p-4">
                <h2 className="text-lg font-semibold">Weight Chart</h2>

                <div className="mt-4 h-72">
                  {weightData.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No weight data recorded yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
                        <Tooltip
                          formatter={(value) => [`${value} kg`, "Weight"]}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.fullDate ?? ""
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border p-4">
                <h2 className="text-lg font-semibold">Growth Analysis</h2>

                {!growthAnalysis.hasEnoughData ? (
                  <p className="mt-3 text-sm text-gray-500">
                    {growthAnalysis.insight}
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <InfoCard
                      label="Total Gain"
                      value={`${growthAnalysis.totalGain.toFixed(1)} kg`}
                    />
                    <InfoCard
                      label="Days Between"
                      value={`${growthAnalysis.daysBetween} days`}
                    />
                    <InfoCard
                      label="Avg Daily Gain"
                      value={`${growthAnalysis.avgDailyGain.toFixed(2)} kg/day`}
                    />
                    <InfoCard
                      label="Status"
                      value={growthAnalysis.status}
                    />
                    <div className="sm:col-span-4 rounded-2xl border p-4">
                      <div className="text-sm text-gray-500">
                        Interpretation
                      </div>
                      <div className="mt-1 text-base">
                        {growthAnalysis.insight}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {timeline.status === "ACTIVE" && (
                <section className="rounded-2xl border p-4">
                  <h2 className="text-lg font-semibold">Tasks</h2>

                  {tasks.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">
                      No upcoming tasks for this pig.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {tasks.map((t) => (
                        <div
                          key={`${t.task}-${t.dueDate}`}
                          className="rounded-xl border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">
                                {taskDisplayName(t.task)}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Due: {new Date(t.dueDate).toLocaleDateString()}
                              </div>
                              <div className="text-sm mt-1">{t.reason}</div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className="text-sm">{t.status}</div>

                              <button
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-white/5"
                                onClick={() =>
                                  taskRequiresForm(t.task)
                                    ? startTaskForm(t.task)
                                    : completeTask(t.task)
                                }
                              >
                                {taskButtonLabel(t.task)}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}