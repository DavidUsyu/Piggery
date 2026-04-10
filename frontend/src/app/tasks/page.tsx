"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type DueTask = {
  pigId: string;
  tagNumber: string;
  task: string;
  dueDate: string;
  daysLeft: number;
  status: "UPCOMING" | "DUE" | "OVERDUE";
  reason: string;
};

type TaskFilter = "ALL" | "OVERDUE" | "DUE" | "UPCOMING";

function taskDisplayName(taskType: string) {
  if (taskType === "WEIGHT_CHECK") return "Weight Check";
  if (taskType === "VACCINATION") return "Vaccination";
  if (taskType === "DEWORMING") return "Deworming";
  if (taskType === "WEANING") return "Weaning";
  if (taskType === "PREGNANCY_CHECK") return "Pregnancy Check";
  if (taskType === "FARROWING_EXPECTED") return "Expected Farrowing";
  if (taskType === "REBREED") return "Returned to heat — breed again";
  return taskType;
}

function countdownLabel(daysLeft: number) {
  if (daysLeft > 0) {
    return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  }
  if (daysLeft === 0) {
    return "Due today";
  }
  return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
}

function statusBadgeClasses(status: DueTask["status"]) {
  if (status === "OVERDUE") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "DUE") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
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

export default function TasksPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<DueTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const tasksData = await apiGet<DueTask[]>("/tasks/due");
        setTasks(tasksData);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const overdueCount = useMemo(
    () => tasks.filter((t) => t.status === "OVERDUE").length,
    [tasks],
  );

  const dueCount = useMemo(
    () => tasks.filter((t) => t.status === "DUE").length,
    [tasks],
  );

  const upcomingCount = useMemo(
    () => tasks.filter((t) => t.status === "UPCOMING").length,
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const filterMatch = filter === "ALL" || task.status === filter;
      const searchMatch =
        normalizedSearch.length === 0 ||
        task.tagNumber.toLowerCase().includes(normalizedSearch) ||
        taskDisplayName(task.task).toLowerCase().includes(normalizedSearch) ||
        task.reason.toLowerCase().includes(normalizedSearch);

      return filterMatch && searchMatch;
    });
  }, [tasks, filter, search]);

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Tasks</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Farm Reminders
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Track overdue, due, and upcoming farm reminders in one place.
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
              type="button"
            >
              Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="All Tasks"
            value={String(tasks.length)}
            helper="All current reminders"
          />
          <SummaryCard
            label="Overdue"
            value={String(overdueCount)}
            helper="Needs immediate attention"
          />
          <SummaryCard
            label="Due"
            value={String(dueCount)}
            helper="Due today"
          />
          <SummaryCard
            label="Upcoming"
            value={String(upcomingCount)}
            helper="Planned ahead"
          />
        </div>

        <SectionCard
          title="Find Tasks"
          subtitle="Filter reminders by status or search by pig, task, or reason."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <input
              type="text"
              placeholder="Search by pig, task, or reason"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TaskFilter)}
              className="w-full rounded-xl border px-4 py-3 text-gray-900"
            >
              <option value="ALL">All Tasks</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE">Due</option>
              <option value="UPCOMING">Upcoming</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "ALL", label: "All" },
              { key: "OVERDUE", label: "Overdue" },
              { key: "DUE", label: "Due" },
              { key: "UPCOMING", label: "Upcoming" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key as TaskFilter)}
                className={`rounded-full border px-4 py-2 text-sm text-gray-900 ${
                  filter === item.key ? "font-semibold" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="All Reminders"
          subtitle={`Open the pig profile to complete or record the relevant action. ${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"} found.`}
        >
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-gray-500">
              No tasks found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Pig
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Task
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Due Date
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Countdown
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Reason
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={`${task.pigId}-${task.task}-${task.dueDate}`} className="border-b">
                      <td className="px-3 py-3 text-gray-900">{task.tagNumber}</td>
                      <td className="px-3 py-3 text-gray-900">
                        {taskDisplayName(task.task)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${statusBadgeClasses(
                            task.status,
                          )}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-900">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-gray-900">
                        {countdownLabel(task.daysLeft)}
                      </td>
                      <td className="px-3 py-3 text-gray-900">{task.reason}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/pigs/${task.pigId}`)}
                          className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900"
                          type="button"
                        >
                          Open Pig
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}