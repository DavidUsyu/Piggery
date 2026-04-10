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
};

type PigGroup = {
  id: string;
  name: string;
  description: string | null;
  pigs: Pig[];
};

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

  async function createGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage("");

    try {
      await apiPost("/pig-groups", {
        name: form.name,
        description: form.description || undefined,
      });

      setForm({ name: "", description: "" });
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

  // IMPORTANT FIX:
  // Build grouped pig IDs from /pig-groups response instead of relying on pigGroupId from /pigs
  const groupedPigIds = useMemo(() => {
    const ids = new Set<string>();

    for (const group of groups) {
      for (const pig of group.pigs) {
        ids.add(pig.id);
      }
    }

    return ids;
  }, [groups]);

  const ungroupedPigs = useMemo(() => {
    return pigs.filter((pig) => !groupedPigIds.has(pig.id));
  }, [pigs, groupedPigIds]);

  const totalGroupedPigs = useMemo(() => {
    return groups.reduce((sum, group) => sum + group.pigs.length, 0);
  }, [groups]);

  const biggestGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return [...groups].sort((a, b) => b.pigs.length - a.pigs.length)[0];
  }, [groups]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Pig Groups</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Pig Group Management
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Organize pigs into batches so shared events and group tracking are easier.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/pigs")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
                type="button"
              >
                Back to Pigs
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
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
          <SummaryCard
            label="Total Groups"
            value={String(groups.length)}
            helper="All created pig groups"
          />
          <SummaryCard
            label="Ungrouped Active Pigs"
            value={String(ungroupedPigs.length)}
            helper="Available to assign"
          />
          <SummaryCard
            label="Grouped Pigs"
            value={String(totalGroupedPigs)}
            helper="Active pigs inside groups"
          />
          <SummaryCard
            label="Largest Group"
            value={biggestGroup ? biggestGroup.name : "No groups"}
            helper={
              biggestGroup
                ? `${biggestGroup.pigs.length} pig(s)`
                : "Create a group to start"
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Create Pig Group"
            subtitle="Example: Group A, March Piglets, Sow 12 Litter 1."
          >
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Group Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Group A"
                  className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional notes about this batch"
                  className="min-h-[120px] w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <button
                className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving..." : "Create Group"}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Assign Pigs to Group"
            subtitle="Select a group, then choose active pigs that are not already grouped."
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Target Group
                </label>
                <select
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
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
                <div className="mb-2 text-sm font-medium text-gray-700">
                  Ungrouped Active Pigs
                </div>

                <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-xl border p-3">
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
                        <span className="text-sm text-gray-900">
                          {pig.tagNumber} • {pig.sex}
                          {pig.breed ? ` • ${pig.breed}` : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                className="rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-60"
                disabled={saving}
                onClick={assignPigsToGroup}
                type="button"
              >
                {saving ? "Saving..." : "Assign Selected Pigs"}
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Existing Groups"
          subtitle="Review group membership and remove pigs from a batch when needed."
        >
          <div className="space-y-5">
            {groups.length === 0 ? (
              <div className="rounded-xl border p-4 text-sm text-gray-500">
                No pig groups created yet.
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="rounded-2xl border p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      <div className="mt-1 text-sm text-gray-600">
                        {group.description || "No description"}
                      </div>
                    </div>

                    <div className="rounded-xl border px-3 py-2 text-sm text-gray-900">
                      {group.pigs.length} pig(s)
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border">
                    <table className="min-w-[700px] w-full table-auto text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Tag Number
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Sex
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Breed
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Action
                          </th>
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
                              <td className="px-4 py-3 text-gray-900">
                                {pig.tagNumber}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {pig.sex}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {pig.breed ?? "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {pig.status}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    className="rounded-xl border px-3 py-2 text-sm font-medium text-gray-900"
                                    onClick={() => router.push(`/pigs/${pig.id}`)}
                                    type="button"
                                  >
                                    Open
                                  </button>
                                  <button
                                    className="rounded-xl border px-3 py-2 text-sm font-medium text-gray-900"
                                    onClick={() =>
                                      removePigFromGroup(group.id, pig.id)
                                    }
                                    type="button"
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
        </SectionCard>
      </div>
    </div>
  );
}