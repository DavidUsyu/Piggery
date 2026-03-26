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

function countdownLabel(daysLeft: number) {
  if (daysLeft > 0) return `${daysLeft} days left`;
  if (daysLeft === 0) return "Due today";
  return `${Math.abs(daysLeft)} days overdue`;
}

function statusBadgeClasses(status: DueTask["status"]) {
  if (status === "OVERDUE") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "DUE") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }
  return "border-green-200 bg-green-50 text-green-700";
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<DueTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OVERDUE" | "DUE" | "UPCOMING">(
    "ALL",
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setError(null);
        const tasksData = await apiGet<DueTask[]>("/tasks/due");
        setTasks(tasksData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load tasks");
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
    if (filter === "ALL") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Tasks</h1>
            <p className="mt-2 text-sm text-gray-500">
              Track overdue, due, and upcoming farm reminders.
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
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Overdue</div>
            <div className="mt-2 text-3xl font-semibold">{overdueCount}</div>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Due</div>
            <div className="mt-2 text-3xl font-semibold">{dueCount}</div>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Upcoming</div>
            <div className="mt-2 text-3xl font-semibold">{upcomingCount}</div>
          </div>
        </div>

        <section className="rounded-2xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">All Reminders</h2>
              <p className="mt-1 text-sm text-gray-500">
                Open the pig profile to complete or record the relevant action.
              </p>
            </div>

            <select
              className="rounded-xl border p-3 text-sm"
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as "ALL" | "OVERDUE" | "DUE" | "UPCOMING",
                )
              }
            >
              <option value="ALL">All Tasks</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE">Due</option>
              <option value="UPCOMING">Upcoming</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border">
            <table className="min-w-[1100px] w-full table-auto text-sm">
              <thead>
                <tr className="border-b">
                  <th className="min-w-[120px] px-4 py-3 text-left">Pig</th>
                  <th className="min-w-[180px] px-4 py-3 text-left">Task</th>
                  <th className="min-w-[140px] px-4 py-3 text-left">Status</th>
                  <th className="min-w-[150px] px-4 py-3 text-left">Due Date</th>
                  <th className="min-w-[160px] px-4 py-3 text-left">Countdown</th>
                  <th className="min-w-[320px] px-4 py-3 text-left">Reason</th>
                  <th className="min-w-[120px] px-4 py-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-gray-500">
                      No tasks found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={`${task.pigId}-${task.task}-${task.dueDate}`} className="border-b align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {task.tagNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {taskDisplayName(task.task)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClasses(
                            task.status,
                          )}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {countdownLabel(task.daysLeft)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{task.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          className="rounded-xl border px-3 py-2 text-sm"
                          onClick={() => router.push(`/pigs/${task.pigId}`)}
                        >
                          Open Pig
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}