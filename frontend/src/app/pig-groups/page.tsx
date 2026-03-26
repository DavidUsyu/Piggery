"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type Pig = {
  id: string;
  tagNumber: string;
  status: string;
  sex: string;
  breed: string | null;
  pigGroupId?: string | null;
};

type PigGroup = {
  id: string;
  name: string;
  description: string | null;
  pigs: Pig[];
};

export default function PigGroupsPage() {
  const router = useRouter();

  const [groups, setGroups] = useState<PigGroup[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [selectedPigIds, setSelectedPigIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
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
      setError(null);
      const [groupsData, pigsData] = await Promise.all([
        apiGet<PigGroup[]>("/pig-groups"),
        apiGet<Pig[]>("/pigs"),
      ]);
      setGroups(groupsData);
      setPigs(pigsData.filter((pig) => pig.status === "ACTIVE"));
    } catch (err: any) {
      setError(err.message ?? "Failed to load pig groups");
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage("");

    try {
      await apiPost("/pig-groups", {
        name: form.name,
        description: form.description || undefined,
      });

      setForm({
        name: "",
        description: "",
      });

      setMessage("Pig group created successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to create pig group");
    } finally {
      setSaving(false);
    }
  }

  async function assignPigsToGroup() {
    if (!selectedGroupId) {
      setError("Please select a group.");
      return;
    }

    if (selectedPigIds.length === 0) {
      setError("Please select at least one pig.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage("");

    try {
      await apiPatch(`/pig-groups/${selectedGroupId}/assign-pigs`, {
        pigIds: selectedPigIds,
      });

      setSelectedPigIds([]);
      setSelectedGroupId("");
      setMessage("Pigs assigned to group successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to assign pigs to group");
    } finally {
      setSaving(false);
    }
  }

  async function removePigFromGroup(groupId: string, pigId: string) {
    try {
      setError(null);
      setMessage("");
      await apiDelete(`/pig-groups/${groupId}/pigs/${pigId}`);
      setMessage("Pig removed from group.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to remove pig from group");
    }
  }

  function togglePig(pigId: string) {
    setSelectedPigIds((current) =>
      current.includes(pigId)
        ? current.filter((id) => id !== pigId)
        : [...current, pigId],
    );
  }

  const ungroupedPigs = useMemo(() => {
    return pigs.filter((pig) => !pig.pigGroupId);
  }, [pigs]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Pig Groups</h1>
            <p className="mt-2 text-sm text-gray-500">
              Organize pigs into batches like Group A so shared events are easier to manage.
            </p>
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
            <h2 className="text-xl font-semibold">Create Pig Group</h2>
            <p className="mt-1 text-sm text-gray-500">
              Example: Group A, March Piglets, Sow 12 Litter 1.
            </p>

            <form onSubmit={createGroup} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <input
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Group A"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="mt-2 w-full rounded-xl border p-3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional notes about this batch"
                />
              </div>

              <button
                className="w-full rounded-xl bg-black p-3 text-white disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Group"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Assign Pigs to Group</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a group, then choose pigs to add into it.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Target Group</label>
                <select
                  className="mt-2 w-full rounded-xl border p-3"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Select Group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.pigs.length} pigs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm font-medium">Ungrouped Active Pigs</div>
                <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto rounded-xl border p-3">
                  {ungroupedPigs.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No ungrouped active pigs available.
                    </div>
                  ) : (
                    ungroupedPigs.map((pig) => (
                      <label
                        key={pig.id}
                        className="flex items-center gap-3 rounded-xl border p-3"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPigIds.includes(pig.id)}
                          onChange={() => togglePig(pig.id)}
                        />
                        <span>
                          {pig.tagNumber} • {pig.sex}
                          {pig.breed ? ` • ${pig.breed}` : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-black p-3 text-white disabled:opacity-60"
                disabled={saving}
                onClick={assignPigsToGroup}
                type="button"
              >
                {saving ? "Saving..." : "Assign Selected Pigs"}
              </button>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Existing Groups</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review group membership and remove pigs from a batch when needed.
          </p>

          <div className="mt-5 space-y-5">
            {groups.length === 0 ? (
              <div className="rounded-xl border p-4 text-sm text-gray-500">
                No pig groups created yet.
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="rounded-2xl border p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                      <div className="mt-1 text-sm text-gray-500">
                        {group.description || "No description"}
                      </div>
                    </div>

                    <div className="rounded-xl border px-3 py-2 text-sm">
                      {group.pigs.length} pigs
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border">
                    <table className="min-w-[700px] w-full table-auto text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left">Tag Number</th>
                          <th className="px-4 py-3 text-left">Sex</th>
                          <th className="px-4 py-3 text-left">Breed</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.pigs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 text-gray-500">
                              No pigs in this group yet.
                            </td>
                          </tr>
                        ) : (
                          group.pigs.map((pig) => (
                            <tr key={pig.id} className="border-b">
                              <td className="px-4 py-3">{pig.tagNumber}</td>
                              <td className="px-4 py-3">{pig.sex}</td>
                              <td className="px-4 py-3">{pig.breed ?? "-"}</td>
                              <td className="px-4 py-3">{pig.status}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    className="rounded-xl border px-3 py-2 text-sm"
                                    onClick={() => router.push(`/pigs/${pig.id}`)}
                                  >
                                    Open
                                  </button>

                                  <button
                                    className="rounded-xl border px-3 py-2 text-sm"
                                    onClick={() =>
                                      removePigFromGroup(group.id, pig.id)
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}