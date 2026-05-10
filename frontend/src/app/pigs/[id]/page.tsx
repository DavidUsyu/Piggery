 "use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  hasClientAuthState,
} from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/dates";
import { getAgeUnit, type AgeUnit } from "@/lib/preferences";
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
  name?: string | null;
  breed?: string | null;
  birthDate?: string | null;
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
  status: "UPCOMING" | "DUE" | "OVERDUE";
  reason: string;
};

type EventFormState = {
  type: string;
  eventDate: string;
  weightKg: string;
  medicine: string;
  dose: string;
  cost: string;
  notes: string;
  boarId: string;
  pigletsBorn: string;
  stillBorn: string;
  pregnancyCheckResult: string;
};

const DEFAULT_FORM = (): EventFormState => ({
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

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    emoji: string;
    helper: string;
    costLabel?: string;
  }
> = {
  WEIGHT: {
    label: "Record Weight",
    emoji: "KG",
    helper: "Quickly save the pig's latest weight",
  },
  DEWORMING: {
    label: "Deworm",
    emoji: "DW",
    helper: "Record deworming and auto-sync the cost to finance",
    costLabel: "Deworming Cost",
  },
  TEETH_CLIPPING: {
    label: "Teeth Clipping",
    emoji: "TC",
    helper: "Record teeth clipping for a piglet",
  },
  TAIL_DOCKING: {
    label: "Tail Docking",
    emoji: "TD",
    helper: "Record tail docking for a piglet",
  },
  CASTRATION: {
    label: "Castration",
    emoji: "CS",
    helper: "Record castration for a male piglet",
    costLabel: "Castration Cost",
  },
  IRON_INJECTION: {
    label: "Iron Injection",
    emoji: "Fe",
    helper: "Record iron injection. Recommended dose: 2ml",
    costLabel: "Iron Injection Cost",
  },
  VACCINATION: {
    label: "Vaccinate",
    emoji: "VX",
    helper: "Record vaccination and auto-sync the cost to finance",
    costLabel: "Vaccination Cost",
  },
  TREATMENT: {
    label: "Treat",
    emoji: "RX",
    helper: "Record treatment and auto-sync the cost to finance",
    costLabel: "Treatment Cost",
  },
  SALE: {
    label: "Record Sale",
    emoji: "KES",
    helper: "Record sale and auto-sync revenue to finance",
    costLabel: "Sale Amount",
  },
  BREEDING: {
    label: "Breeding",
    emoji: "BR",
    helper: "Record a breeding event for this female pig",
  },
  PREGNANCY_CHECK: {
    label: "Pregnancy Check",
    emoji: "PC",
    helper: "Record the pregnancy check result",
  },
  FARROWING: {
    label: "Farrowing",
    emoji: "FR",
    helper: "Record piglets born and stillborn count",
  },
  WEANING: {
    label: "Weaning",
    emoji: "WN",
    helper: "Record weaning for this pig or litter",
  },
  NOTE: {
    label: "Add Note",
    emoji: "NT",
    helper: "Save a general note for this pig",
  },
};

function pregnancyStatusLabel(status: string) {
  if (status === "NOT_PREGNANT") return "Not Pregnant";
  if (status === "PREGNANT") return "Pregnant";
  if (status === "RETURNED_TO_HEAT") return "Returned to Heat";
  return status;
}

function eventLabel(type: string) {
  if (type === "WEIGHT") return "Weight";
  if (type === "VACCINATION") return "Vaccination";
  if (type === "DEWORMING") return "Deworming";
  if (type === "TEETH_CLIPPING") return "Teeth Clipping";
  if (type === "TAIL_DOCKING") return "Tail Docking";
  if (type === "CASTRATION") return "Castration";
  if (type === "IRON_INJECTION") return "Iron Injection";
  if (type === "BREEDING") return "Breeding";
  if (type === "PREGNANCY_CHECK") return "Pregnancy Check";
  if (type === "FARROWING") return "Farrowing";
  if (type === "WEANING") return "Weaning";
  if (type === "ILLNESS") return "Illness";
  if (type === "TREATMENT") return "Treatment";
  if (type === "SALE") return "Sale";
  if (type === "DEATH") return "Death";
  if (type === "CONSUMED") return "Consumed";
  if (type === "NOTE") return "Note";
  return type;
}

function taskDisplayName(taskType: string) {
  if (taskType === "WEIGHT_CHECK") return "Weight Check";
  if (taskType === "VACCINATION") return "Vaccination";
  if (taskType === "DEWORMING") return "Deworming";
  if (taskType === "TEETH_CLIPPING") return "Teeth Clipping";
  if (taskType === "TAIL_DOCKING") return "Tail Docking";
  if (taskType === "CASTRATION") return "Castration";
  if (taskType === "IRON_INJECTION") return "Iron Injection";
  if (taskType === "WEANING") return "Weaning";
  if (taskType === "PREGNANCY_CHECK") return "Pregnancy Check";
  if (taskType === "FARROWING_EXPECTED") return "Expected Farrowing";
  if (taskType === "REBREED") return "Returned to heat - breed again";
  return taskType;
}

function taskRequiresForm(taskType: string) {
  return [
    "WEIGHT_CHECK",
    "VACCINATION",
    "DEWORMING",
    "TEETH_CLIPPING",
    "TAIL_DOCKING",
    "CASTRATION",
    "IRON_INJECTION",
    "PREGNANCY_CHECK",
    "REBREED",
  ].includes(taskType);
}

function taskToEventType(taskType: string) {
  if (taskType === "WEIGHT_CHECK") return "WEIGHT";
  if (taskType === "REBREED") return "BREEDING";
  if (taskType === "FARROWING_EXPECTED") return "FARROWING";
  return taskType;
}

function formatTimelineAge(ageDays: number, unit: AgeUnit) {
  if (unit === "days") return `${ageDays} days`;
  const ageMonths = Math.floor(ageDays / 30);
  return `${ageMonths} month${ageMonths === 1 ? "" : "s"}`;
}

function showWeightField(type: string) {
  return type === "WEIGHT";
}

function showMedicationFields(type: string) {
  return ["VACCINATION", "DEWORMING", "TREATMENT", "IRON_INJECTION"].includes(type);
}

function showBreedingFields(type: string) {
  return type === "BREEDING";
}

function showPregnancyCheckFields(type: string) {
  return type === "PREGNANCY_CHECK";
}

function showFarrowingFields(type: string) {
  return type === "FARROWING";
}

function showCostField(type: string) {
  return [
    "VACCINATION",
    "DEWORMING",
    "TREATMENT",
    "IRON_INJECTION",
    "CASTRATION",
    "SALE",
  ].includes(type);
}

function statusTone(status: PigTask["status"]) {
  if (status === "OVERDUE") return "border-red-200 bg-red-50 text-red-700";
  if (status === "DUE") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
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
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
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

export default function PigProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ageUnit, setAgeUnit] = useState<AgeUnit>("days");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [events, setEvents] = useState<PigEvent[]>([]);
  const [tasks, setTasks] = useState<PigTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingPig, setDeletingPig] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [formMode, setFormMode] = useState<"quick" | "advanced">("quick");
  const [selectedAction, setSelectedAction] = useState<string>("WEIGHT");
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM());
  useEffect(() => {
  if (window.location.hash === "#edit") {
    setTimeout(() => {
      document.getElementById("edit")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 300);
  }
}, []);

    // Pig info form state
    const [pigForm, setPigForm] = useState({
      tagNumber: "",
      name: "",
      sex: "FEMALE",
      breed: "",
      birthDate: "",
    });
    const [savingPigInfo, setSavingPigInfo] = useState(false);
  async function updatePigInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPigInfo(true);
    setError(null);

    try {
      await apiPatch(`/pigs/${id}`, {
        tagNumber: pigForm.tagNumber,
        name: pigForm.name || undefined,
        sex: pigForm.sex,
        breed: pigForm.breed || undefined,
        birthDate: pigForm.birthDate || undefined,
      });

      await loadPigData();
    } catch (err: any) {
      setError(err.message ?? "Failed to update pig information");
    } finally {
      setSavingPigInfo(false);
    }
  }

  useEffect(() => {
    setAgeUnit(getAgeUnit());
  }, []);

  const quickActions = useMemo(() => {
    if (!timeline) return [];
    const common = [
      "WEIGHT",
      "DEWORMING",
      "TEETH_CLIPPING",
      "TAIL_DOCKING",
      "IRON_INJECTION",
      "VACCINATION",
      "TREATMENT",
      "SALE",
    ];
    const maleOnly = ["CASTRATION"];
    const femaleOnly = ["BREEDING", "PREGNANCY_CHECK", "FARROWING", "WEANING"];
    return timeline.sex === "FEMALE"
      ? [...common, ...femaleOnly]
      : [...common, ...maleOnly];
  }, [timeline]);

  const availableAdvancedTypes = useMemo(() => {
    if (!timeline) return Object.keys(ACTION_CONFIG);
    const base = [
      "WEIGHT",
      "DEWORMING",
      "TEETH_CLIPPING",
      "TAIL_DOCKING",
      "IRON_INJECTION",
      "VACCINATION",
      "TREATMENT",
      "SALE",
      "NOTE",
    ];
    const maleOnly = ["CASTRATION"];
    const femaleOnly = ["BREEDING", "PREGNANCY_CHECK", "FARROWING", "WEANING"];
    return timeline.sex === "FEMALE" ? [...base, ...femaleOnly] : [...base, ...maleOnly];
  }, [timeline]);

  const weightData = useMemo(() => {
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
        date: formatDate(d),
        fullDate: d.toISOString(),
        weight: e.weightKg,
      });
    }

    return Array.from(latestPerDay.values());
  }, [events]);

  const growthAnalysis = useMemo(() => {
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
      insight =
        "Growth is strong. Maintain current feeding and health practices.";
    }

    return {
      hasEnoughData: true,
      totalGain,
      daysBetween,
      avgDailyGain,
      status,
      insight,
    };
  }, [weightData]);

  const recentEvents = useMemo(() => {
    return [...events]
      .sort(
        (a, b) =>
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
      )
      .slice(0, 8);
  }, [events]);

  const selectedConfig = ACTION_CONFIG[selectedAction] ?? ACTION_CONFIG.WEIGHT;
  const profileDetails = [
    timeline?.sex,
    timeline?.stage,
    timeline ? `Status: ${timeline.status}` : null,
    timeline?.sex === "FEMALE"
      ? `Pregnancy: ${pregnancyStatusLabel(timeline.pregnancyStatus)}`
      : null,
  ].filter(Boolean);

  function resetEventForm(nextType = "WEIGHT") {
    setEditingEventId(null);
    setSelectedAction(nextType);
    setForm({
      ...DEFAULT_FORM(),
      type: nextType,
    });
  }

  function openQuickAction(type: string) {
    setFormMode("quick");
    setEditingEventId(null);
    setSelectedAction(type);

    const base = DEFAULT_FORM();
    base.type = type;

    if (type === "SALE") {
      base.notes = "Recorded from quick sale action";
    }

    if (type === "IRON_INJECTION") {
      base.dose = "2ml";
    }

    setForm(base);

    document
      .getElementById("pig-action-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startEditEvent(event: PigEvent) {
    setFormMode("advanced");
    setEditingEventId(event.id);
    setSelectedAction(event.type);
    setForm({
      type: event.type,
      eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
      weightKg: event.weightKg !== null ? String(event.weightKg) : "",
      medicine: event.medicine ?? "",
      dose: event.dose ?? "",
      cost: event.cost !== null ? String(event.cost) : "",
      notes: event.notes ?? "",
      boarId: event.boarId ?? "",
      pigletsBorn: event.pigletsBorn !== null ? String(event.pigletsBorn) : "",
      stillBorn: event.stillBorn !== null ? String(event.stillBorn) : "",
      pregnancyCheckResult: event.pregnancyCheckResult ?? "",
    });

    document
      .getElementById("pig-action-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startTaskForm(taskType: string) {
    const eventType = taskToEventType(taskType);
    setFormMode("quick");
    setEditingEventId(null);
    setSelectedAction(eventType);
    setForm({
      ...DEFAULT_FORM(),
      type: eventType,
      notes:
        taskType === "WEIGHT_CHECK"
          ? "Created from weight check task"
          : taskType === "REBREED"
            ? "Created because the pig returned to heat. Record a new breeding event."
            : `Created from task: ${taskType}`,
      dose: eventType === "IRON_INJECTION" ? "2ml" : "",
    });

    document
      .getElementById("pig-action-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const loadPigData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [timelineRes, eventsRes, tasksRes] = await Promise.all([
        apiGet<Timeline>(`/pigs/${id}/timeline`),
        apiGet<PigEvent[]>(`/events?pigId=${id}`),
        apiGet<PigTask[]>("/tasks/due"),
      ]);

      setTimeline(timelineRes);
      setPigForm({
        tagNumber: timelineRes.tagNumber ?? "",
        name: timelineRes.name ?? "",
        sex: timelineRes.sex ?? "FEMALE",
        breed: timelineRes.breed ?? "",
        birthDate: timelineRes.birthDate
          ? new Date(timelineRes.birthDate).toISOString().slice(0, 10)
          : "",
      });
      setEvents(eventsRes);
      setTasks(tasksRes.filter((t) => t.pigId === id));
    } catch (err: any) {
      setError(err.message ?? "Failed to load pig profile");
    }
  }, [id]);

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
      resetEventForm(selectedAction);
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

  async function deletePig() {
    if (!timeline) return;

    const confirmed = window.confirm(
      `Delete pig #${timeline.tagNumber}? This will remove its pig profile and event history.`,
    );
    if (!confirmed) return;

    try {
      setDeletingPig(true);
      setError(null);
      await apiDelete(`/pigs/${id}`);
      router.push("/pigs/all");
    } catch (err: any) {
      setError(err.message ?? "Failed to delete pig");
    } finally {
      setDeletingPig(false);
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
    if (!hasClientAuthState()) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    void loadPigData();
  }, [loadPigData]);

  if (!timeline) {
    return <div className="p-6">Loading pig profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Pig Profile</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                #{timeline.tagNumber}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {profileDetails.map((detail) => (
                  <span
                    key={String(detail)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={ageUnit}
                onChange={(e) => setAgeUnit(e.target.value as AgeUnit)}
                className="rounded-xl border px-3 py-2 text-gray-900"
              >
                <option value="days">Show age in days</option>
                <option value="months">Show age in months</option>
              </select>

              <button
                type="button"
                onClick={() => router.push("/pigs/all")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
              >
                All Pigs
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={deletePig}
                disabled={deletingPig}
                className="min-h-11 w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-700 hover:bg-red-700 hover:text-white disabled:opacity-60 sm:w-auto"
              >
                {deletingPig ? "Deleting..." : "Delete Pig"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : null}
        </div>


        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Age"
            value={formatTimelineAge(timeline.ageDays, ageUnit)}
          />
          <SummaryCard
            label="Last Weight"
            value={
              timeline.lastWeight?.weightKg !== null &&
              timeline.lastWeight?.weightKg !== undefined
                ? `${timeline.lastWeight.weightKg} kg`
                : "No record"
            }
            helper={
              timeline.lastWeight
                ? formatDate(timeline.lastWeight.eventDate)
                : undefined
            }
          />
          <SummaryCard
            label="Pregnancy"
            value={pregnancyStatusLabel(timeline.pregnancyStatus)}
            helper={
              timeline.expectedFarrowingDate
                ? `Expected farrowing: ${formatDate(
                    timeline.expectedFarrowingDate,
                  )}`
                : undefined
            }
          />
          <SummaryCard
            label="Recommendations"
            value={String(timeline.recommendations.length)}
            helper="Auto-generated for this pig"
          />
        </div>

        {/* Edit Pig Info Section */}
        <SectionCard
          title="Edit Pig Info"
          subtitle="Correct basic pig details if something was entered wrongly."
        >
          <div id="edit">
            <form onSubmit={updatePigInfo} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tag Number
                </label>
                <input
                  type="text"
                  value={pigForm.tagNumber}
                  onChange={(e) =>
                    setPigForm((prev) => ({ ...prev, tagNumber: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={pigForm.name}
                  onChange={(e) =>
                    setPigForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                  placeholder="Optional pig name"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sex
                </label>
                <select
                  value={pigForm.sex}
                  onChange={(e) =>
                    setPigForm((prev) => ({ ...prev, sex: e.target.value }))
                  }
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
                <input
                  type="text"
                  value={pigForm.breed}
                  onChange={(e) =>
                    setPigForm((prev) => ({ ...prev, breed: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                  placeholder="Breed"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={pigForm.birthDate}
                  onChange={(e) =>
                    setPigForm((prev) => ({ ...prev, birthDate: e.target.value }))
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPigInfo}
              className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              {savingPigInfo ? "Saving..." : "Save Pig Info"}
            </button>
            </form>
          </div>
        </SectionCard>

        {timeline.status === "ACTIVE" ? (
          <SectionCard
            title="Quick Actions"
            subtitle="Use simple real-world actions instead of a generic event form."
          >
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setFormMode("quick")}
                className={`rounded-xl border px-4 py-2 text-sm text-gray-900 ${
                  formMode === "quick" ? "font-semibold" : ""
                }`}
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setFormMode("advanced")}
                className={`rounded-xl border px-4 py-2 text-sm text-gray-900 ${
                  formMode === "advanced" ? "font-semibold" : ""
                }`}
              >
                Advanced
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {quickActions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => openQuickAction(type)}
                  className={`rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm ${
                    selectedAction === type ? "ring-1 ring-gray-300" : ""
                  }`}
                >
                  <div className="text-2xl">{ACTION_CONFIG[type].emoji}</div>
                  <div className="mt-2 font-semibold text-gray-900">
                    {ACTION_CONFIG[type].label}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {ACTION_CONFIG[type].helper}
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <SectionCard
              title={
                editingEventId
                  ? `Edit ${eventLabel(form.type)}`
                  : selectedConfig.label
              }
              subtitle={
                editingEventId ? "Update this event" : selectedConfig.helper
              }
            >
              <div id="pig-action-form">
                {!editingEventId ? null : (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => resetEventForm("WEIGHT")}
                      className="rounded-xl border px-4 py-2 text-sm text-gray-900"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}

                <form onSubmit={addEvent} className="space-y-4">
                  {formMode === "advanced" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Event Type
                      </label>
                      <select
                        value={form.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          setSelectedAction(type);
                          setForm((prev) => ({ ...prev, type }));
                        }}
                        className="w-full rounded-xl border px-4 py-3 text-gray-900"
                      >
                        {availableAdvancedTypes.map((type) => (
                          <option key={type} value={type}>
                            {eventLabel(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="rounded-xl border p-3 text-sm text-gray-900">
                      Selected action:{" "}
                      <span className="font-semibold">{eventLabel(form.type)}</span>
                    </div>
                  )}

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

                  {showWeightField(form.type) ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter weight"
                        value={form.weightKg}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, weightKg: e.target.value }))
                        }
                        className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                        required
                      />
                    </div>
                  ) : null}

                  {showMedicationFields(form.type) ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Medicine
                        </label>
                        <input
                          type="text"
                          placeholder="Medicine used"
                          value={form.medicine}
                          onChange={(e) =>
                            setForm((prev) => ({
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
                          placeholder="Dose"
                          value={form.dose}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, dose: e.target.value }))
                          }
                          className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                        />
                      </div>

                      {showCostField(form.type) ? (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {ACTION_CONFIG[form.type]?.costLabel ?? "Cost"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter amount"
                            value={form.cost}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                cost: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            This will sync to Finance automatically.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {form.type === "SALE" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Sale Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter sale amount"
                        value={form.cost}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, cost: e.target.value }))
                        }
                        className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This will create revenue in Finance automatically.
                      </p>
                    </div>
                  ) : null}

                  {showBreedingFields(form.type) ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Boar ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter boar ID"
                        value={form.boarId}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, boarId: e.target.value }))
                        }
                        className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                  ) : null}

                  {showPregnancyCheckFields(form.type) ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Pregnancy Check Result
                      </label>
                      <select
                        value={form.pregnancyCheckResult}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            pregnancyCheckResult: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border px-4 py-3 text-gray-900"
                      >
                        <option value="">Select result</option>
                        <option value="PREGNANT">Pregnant</option>
                        <option value="NOT_PREGNANT">Not Pregnant</option>
                        <option value="RETURNED_TO_HEAT">Returned to Heat</option>
                      </select>
                    </div>
                  ) : null}

                  {showFarrowingFields(form.type) ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Piglets Born
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Number of piglets born"
                          value={form.pigletsBorn}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              pigletsBorn: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Stillborn
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Number of stillborn"
                          value={form.stillBorn}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              stillBorn: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      placeholder="Add notes"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="min-h-[100px] w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving || timeline.status !== "ACTIVE"}
                      className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                    >
                      {saving
                        ? "Saving..."
                        : editingEventId
                          ? "Update Event"
                          : "Save Action"}
                    </button>

                    <button
                      type="button"
                      onClick={() => resetEventForm(selectedAction)}
                      className="rounded-xl border px-4 py-3 font-medium text-gray-900"
                    >
                      Reset
                    </button>
                  </div>

                  {timeline.status !== "ACTIVE" ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                      This pig is no longer active. You cannot add new events.
                    </div>
                  ) : null}
                </form>
              </div>
            </SectionCard>

            <SectionCard
              title="Recent Event History"
              subtitle="Latest activity for this pig."
            >
              <div className="space-y-3">
                {recentEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                    No events recorded yet.
                  </div>
                ) : (
                  recentEvents.map((event) => (
                    <div key={event.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {eventLabel(event.type)}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {formatDateTime(event.eventDate)}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-700">
                            {event.weightKg !== null ? (
                              <span className="rounded-full border px-3 py-1">
                                {event.weightKg} kg
                              </span>
                            ) : null}
                            {event.medicine ? (
                              <span className="rounded-full border px-3 py-1">
                                Medicine: {event.medicine}
                              </span>
                            ) : null}
                            {event.dose ? (
                              <span className="rounded-full border px-3 py-1">
                                Dose: {event.dose}
                              </span>
                            ) : null}
                            {event.cost !== null ? (
                              <span className="rounded-full border px-3 py-1">
                                KES {event.cost.toLocaleString()}
                              </span>
                            ) : null}
                            {event.boarId ? (
                              <span className="rounded-full border px-3 py-1">
                                Boar ID: {event.boarId}
                              </span>
                            ) : null}
                            {event.pigletsBorn !== null ? (
                              <span className="rounded-full border px-3 py-1">
                                Born: {event.pigletsBorn}
                              </span>
                            ) : null}
                            {event.stillBorn !== null ? (
                              <span className="rounded-full border px-3 py-1">
                                Stillborn: {event.stillBorn}
                              </span>
                            ) : null}
                            {event.pregnancyCheckResult ? (
                              <span className="rounded-full border px-3 py-1">
                                {pregnancyStatusLabel(
                                  event.pregnancyCheckResult,
                                )}
                              </span>
                            ) : null}
                          </div>

                          {event.notes ? (
                            <div className="mt-3 text-sm text-gray-700">
                              {event.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditEvent(event)}
                            className="rounded-xl border px-3 py-2 text-sm text-gray-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEvent(event.id)}
                            className="rounded-xl border px-3 py-2 text-sm text-gray-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Weight Trend"
              subtitle="Visual growth history for this pig."
            >
              <div className="h-72">
                {weightData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">
                    No weight data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="mt-4 rounded-xl border p-4">
                <div className="text-sm text-gray-500">Growth Analysis</div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {growthAnalysis.status}
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  {growthAnalysis.insight}
                </div>

                {growthAnalysis.hasEnoughData ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-gray-500">Total Gain</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        {growthAnalysis.totalGain.toFixed(2)} kg
                      </div>
                    </div>
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-gray-500">Days Between</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        {growthAnalysis.daysBetween}
                      </div>
                    </div>
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-gray-500">Avg Daily Gain</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        {growthAnalysis.avgDailyGain.toFixed(2)} kg/day
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Recommendations"
              subtitle="Auto-generated suggestions for this pig."
            >
              <div className="space-y-3">
                {timeline.recommendations.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                    No recommendations.
                  </div>
                ) : (
                  timeline.recommendations.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border p-3 text-sm text-gray-900"
                    >
                      {item}
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Due Tasks"
              subtitle="Recommended actions for this pig."
            >
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                    No due tasks for this pig.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={`${task.task}-${task.dueDate}`}
                      className={`rounded-xl border p-4 ${statusTone(task.status)}`}
                    >
                      <div className="font-semibold">
                        {taskDisplayName(task.task)}
                      </div>
                      <div className="mt-1 text-sm">{task.reason}</div>
                      <div className="mt-1 text-xs">
                        Due: {formatDate(task.dueDate)}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {taskRequiresForm(task.task) ? (
                          <button
                            type="button"
                            onClick={() => startTaskForm(task.task)}
                            className="rounded-xl border px-3 py-2 text-sm"
                          >
                            Open Form
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => completeTask(task.task)}
                            className="rounded-xl border px-3 py-2 text-sm"
                          >
                            Complete Task
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Outcome"
              subtitle="Use this when the pig leaves active production."
            >
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Optional note for this status update"
                className="min-h-[100px] w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updatePigStatus("SOLD")}
                  className="rounded-xl border px-4 py-3 text-gray-900"
                >
                  Mark as Sold
                </button>
                <button
                  type="button"
                  onClick={() => updatePigStatus("DEAD")}
                  className="rounded-xl border px-4 py-3 text-gray-900"
                >
                  Mark as Dead
                </button>
                <button
                  type="button"
                  onClick={() => updatePigStatus("CONSUMED")}
                  className="rounded-xl border px-4 py-3 text-gray-900"
                >
                  Mark as Consumed
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

