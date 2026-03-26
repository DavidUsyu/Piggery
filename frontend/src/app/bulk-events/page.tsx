"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type Pig = {
  id: string;
  tagNumber: string;
  status: string;
  pigGroupId?: string | null;
};

type PigGroup = {
  id: string;
  name: string;
  description: string | null;
  pigs: Pig[];
};

export default function BulkEventsPage() {
  const router = useRouter();

  const [pigs, setPigs] = useState<Pig[]>([]);
  const [groups, setGroups] = useState<PigGroup[]>([]);
  const [selectedPigIds, setSelectedPigIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    selectionMode: "group",
    pigGroupId: "",
    type: "VACCINATION",
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

    async function load() {
      try {
        setError(null);
        const [pigsData, groupsData] = await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<PigGroup[]>("/pig-groups"),
        ]);
        setPigs(pigsData.filter((p) => p.status === "ACTIVE"));
        setGroups(groupsData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load bulk events page");
      }
    }

    load();
  }, [router]);

  function togglePig(pigId: string) {
    setSelectedPigIds((current) =>
      current.includes(pigId)
        ? current.filter((id) => id !== pigId)
        : [...current, pigId],
    );
  }

  async function submitBulkEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage("");

    try {
      const payload: any = {
        type: form.type,
        eventDate: new Date(form.eventDate).toISOString(),
        medicine: form.medicine || undefined,
        dose: form.dose || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        notes: form.notes || undefined,
      };

      if (form.selectionMode === "group") {
        payload.pigGroupId = form.pigGroupId;
      } else {
        payload.pigIds = selectedPigIds;
      }

      const res = await apiPost<{ message: string }>("/events/bulk", payload);
      setMessage(res.message);

      setSelectedPigIds([]);
      setForm({
        ...form,
        medicine: "",
        dose: "",
        cost: "",
        notes: "",
      });
    } catch (err: any) {
      setError(err.message ?? "Failed to create bulk event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Bulk Events</h1>
            <p className="mt-2 text-sm text-gray-500">
              Apply one event to a whole pig group or selected pigs.
            </p>
          </div>

          <button
            className="rounded-2xl border px-4 py-2"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Create Bulk Event</h2>

            <form onSubmit={submitBulkEvent} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Selection Mode</label>
                <select
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.selectionMode}
                  onChange={(e) =>
                    setForm({ ...form, selectionMode: e.target.value })
                  }
                >
                  <option value="group">Whole Group</option>
                  <option value="manual">Select Pigs Manually</option>
                </select>
              </div>

              {form.selectionMode === "group" && (
                <div>
                  <label className="text-sm font-medium">Pig Group</label>
                  <select
                    className="mt-2 w-full rounded-xl border p-3"
                    value={form.pigGroupId}
                    onChange={(e) =>
                      setForm({ ...form, pigGroupId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.pigs.length} pigs)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Event Type</label>
                <select
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="VACCINATION">VACCINATION</option>
                  <option value="DEWORMING">DEWORMING</option>
                  <option value="WEANING">WEANING</option>
                  <option value="TREATMENT">TREATMENT</option>
                  <option value="NOTE">NOTE</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Event Date</label>
                <input
                  className="mt-2 w-full rounded-xl border p-3"
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(e) =>
                    setForm({ ...form, eventDate: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Medicine</label>
                <input
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.medicine}
                  onChange={(e) =>
                    setForm({ ...form, medicine: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Dose</label>
                <input
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.dose}
                  onChange={(e) => setForm({ ...form, dose: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cost</label>
                <input
                  className="mt-2 w-full rounded-xl border p-3"
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <button
                className="w-full rounded-xl bg-black p-3 text-white disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Bulk Event"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Manual Pig Selection</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use this when you do not want to target a whole group.
            </p>

            <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto">
              {pigs.map((pig) => (
                <label
                  key={pig.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedPigIds.includes(pig.id)}
                    onChange={() => togglePig(pig.id)}
                    disabled={form.selectionMode !== "manual"}
                  />
                  <span>{pig.tagNumber}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}