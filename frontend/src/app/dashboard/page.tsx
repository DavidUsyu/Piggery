"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiDelete,
  apiGet,
  apiPost,
  clearClientAuthState,
  hasClientAuthState,
} from "@/lib/api";

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

type DueTask = {
  pigId: string;
  tagNumber: string;
  task: string;
  dueDate: string;
  daysLeft: number;
  status: "UPCOMING" | "DUE" | "OVERDUE";
  reason: string;
};

type MeResponse = {
  id: string;
  name: string | null;
  email: string;
  farmId: string | null;
  farmName: string | null;
  role: string | null;
};

type FinanceSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  status: "PROFIT" | "LOSS" | "BREAK_EVEN";
  saleCount: number;
  expenseCount: number;
  recentSales: Array<{
    id: string;
    totalAmount: number;
    saleDate: string;
    buyerName?: string | null;
    pig?: { tagNumber: string } | null;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
  }>;
};

type PigProfit = {
  pigId: string;
  tagNumber: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  status: "PROFIT" | "LOSS" | "BREAK_EVEN";
};

type QuickActionCardProps = {
  title: string;
  subtitle: string;
  emoji: string;
  onClick: () => void;
};

type SummaryCardProps = {
  label: string;
  value: string;
  helper?: string;
};

function SummaryCard({ label, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-gray-500">{helper}</div> : null}
    </div>
  );
}

function QuickActionCard({
  title,
  subtitle,
  emoji,
  onClick,
}: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border bg-white px-5 py-6 text-left shadow-sm transition hover:bg-gray-50 hover:shadow-md w-full"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 text-3xl leading-none">{emoji}</div>

        <div className="min-w-0">
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          <div className="mt-2 text-sm leading-6 text-gray-600">
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  );
}

function getAlertTone(status: DueTask["status"]) {
  if (status === "OVERDUE") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (status === "DUE") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [tasks, setTasks] = useState<DueTask[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [bestPig, setBestPig] = useState<PigProfit | null>(null);
  const [worstPig, setWorstPig] = useState<PigProfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activePigs = useMemo(
    () => pigs.filter((pig) => pig.status === "ACTIVE"),
    [pigs],
  );

  const pregnantPigs = useMemo(
    () =>
      pigs.filter(
        (pig) =>
          pig.status === "ACTIVE" &&
          pig.sex === "FEMALE" &&
          pig.pregnancyStatus === "PREGNANT",
      ),
    [pigs],
  );

  const overdueTasks = useMemo(
    () => tasks.filter((task) => task.status === "OVERDUE"),
    [tasks],
  );

  const dueTasks = useMemo(
    () => tasks.filter((task) => task.status === "DUE"),
    [tasks],
  );

  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.status === "UPCOMING"),
    [tasks],
  );

  const topAlerts = useMemo(() => {
    return [...tasks]
      .sort((a, b) => {
        const priority = { OVERDUE: 0, DUE: 1, UPCOMING: 2 };
        const statusDiff = priority[a.status] - priority[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.daysLeft - b.daysLeft;
      })
      .slice(0, 5);
  }, [tasks]);

  useEffect(() => {
    if (!hasClientAuthState()) {
      router.push("/login");
      return;
    }

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const [pigsData, tasksData, meData, financeData] = await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<DueTask[]>("/tasks/due"),
          apiGet<MeResponse>("/auth/me"),
          apiGet<FinanceSummary>("/finance/summary"),
        ]);

        setPigs(pigsData);
        setTasks(tasksData);
        setMe(meData);
        setFinance(financeData);

        const activePigIds = pigsData
          .filter((pig) => pig.status === "ACTIVE")
          .map((pig) => pig.id);

        if (activePigIds.length > 0) {
          const profitResults = await Promise.allSettled(
            activePigIds.map((pigId) =>
              apiGet<PigProfit>(`/finance/pig/${pigId}/profit`),
            ),
          );

          const successful = profitResults
            .filter(
              (
                result,
              ): result is PromiseFulfilledResult<PigProfit> =>
                result.status === "fulfilled",
            )
            .map((result) => result.value);

          if (successful.length > 0) {
            const sorted = [...successful].sort(
              (a, b) => b.netProfit - a.netProfit,
            );
            setBestPig(sorted[0]);
            setWorstPig(sorted[sorted.length - 1]);
          } else {
            setBestPig(null);
            setWorstPig(null);
          }
        } else {
          setBestPig(null);
          setWorstPig(null);
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    try {
      await apiPost("/auth/logout", {});
    } finally {
      clearClientAuthState();
    }

    router.push("/login");
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? You can recover it within 30 days.",
    );

    if (!confirmed) return;

    try {
      setError(null);
      await apiDelete("/auth/account");
      clearClientAuthState();
      router.push("/login");
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete account");
    }
  }

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm text-gray-500">Dashboard</div>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Welcome{me?.name ? `, ${me.name}` : ""}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {me?.farmName ?? "No farm"} {me?.role ? `• ${me.role}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem("start-walkthrough", "true");
                window.dispatchEvent(new Event("start-feature-walkthrough"));
              }}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              Start App Tour
            </button>
            <button
              onClick={() => router.push("/forgot-password")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              Recover Account
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600"
            >
              Delete Account
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Farm Snapshot</h2>
            <p className="text-sm text-gray-600">
              These cards should tell the farmer what is happening immediately.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Net Profit"
              value={`KES ${(finance?.netProfit ?? 0).toLocaleString()}`}
              helper={finance?.status ?? "No data yet"}
            />
            <SummaryCard
              label="Total Revenue"
              value={`KES ${(finance?.totalRevenue ?? 0).toLocaleString()}`}
              helper={`${finance?.saleCount ?? 0} sales recorded`}
            />
            <SummaryCard
              label="Total Expenses"
              value={`KES ${(finance?.totalExpenses ?? 0).toLocaleString()}`}
              helper={`${finance?.expenseCount ?? 0} expenses recorded`}
            />
            <SummaryCard
              label="Active Pigs"
              value={String(activePigs.length)}
              helper={`${pregnantPigs.length} pregnant`}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Alerts & Tasks
                </h2>
                <p className="text-sm text-gray-600">
                  Prioritized by what needs action first.
                </p>
              </div>

              <button
                onClick={() => router.push("/tasks")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                View All
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-red-50 p-4">
                <div className="text-sm text-red-700">Overdue</div>
                <div className="mt-2 text-2xl font-bold text-red-800">
                  {overdueTasks.length}
                </div>
              </div>
              <div className="rounded-xl border bg-amber-50 p-4">
                <div className="text-sm text-amber-700">Due now</div>
                <div className="mt-2 text-2xl font-bold text-amber-800">
                  {dueTasks.length}
                </div>
              </div>
              <div className="rounded-xl border bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Upcoming</div>
                <div className="mt-2 text-2xl font-bold text-blue-800">
                  {upcomingTasks.length}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {topAlerts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-5 text-sm text-gray-500">
                  No urgent alerts right now.
                </div>
              ) : (
                topAlerts.map((task) => (
                  <button
                    key={`${task.pigId}-${task.task}-${task.dueDate}`}
                    type="button"
                    onClick={() => router.push(`/pigs/${task.pigId}`)}
                    className={`w-full rounded-xl border p-4 text-left transition hover:shadow-sm ${getAlertTone(
                      task.status,
                    )}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-semibold">
                          {task.tagNumber} • {task.task}
                        </div>
                        <div className="mt-1 text-sm">{task.reason}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {task.status === "OVERDUE"
                          ? `${Math.abs(task.daysLeft)} day(s) overdue`
                          : task.status === "DUE"
                            ? "Due today"
                            : `Due in ${task.daysLeft} day(s)`}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Pig Insights</h2>
            <p className="mt-1 text-sm text-gray-600">
              Quick profitability highlights from your current data.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border bg-green-50 p-4">
                <div className="text-sm text-green-700">Most Profitable Pig</div>
                <div className="mt-2 text-lg font-bold text-green-900">
                  {bestPig?.tagNumber ?? "No data yet"}
                </div>
                <div className="mt-1 text-sm text-green-800">
                  {bestPig
                    ? `KES ${bestPig.netProfit.toLocaleString()}`
                    : "Add sales and expenses to see this"}
                </div>
              </div>

              <div className="rounded-xl border bg-orange-50 p-4">
                <div className="text-sm text-orange-700">Least Profitable Pig</div>
                <div className="mt-2 text-lg font-bold text-orange-900">
                  {worstPig?.tagNumber ?? "No data yet"}
                </div>
                <div className="mt-1 text-sm text-orange-800">
                  {worstPig
                    ? `KES ${worstPig.netProfit.toLocaleString()}`
                    : "Add sales and expenses to see this"}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Top expense category</div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {finance?.expenseBreakdown?.[0]?.category ?? "No data yet"}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {finance?.expenseBreakdown?.[0]
                    ? `KES ${finance.expenseBreakdown[0].amount.toLocaleString()}`
                    : "Record expenses to see this"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-600">
              Open the main parts of the farm system quickly.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div data-tour="dashboard-pigs-card">
              <QuickActionCard
                title="Pig Management"
                subtitle="Open pigs, register pigs, and manage pig details."
                emoji="🐷"
                onClick={() => router.push("/pigs")}
              />
            </div>

            <div data-tour="dashboard-finance-card">
              <QuickActionCard
                title="Finance"
                subtitle="Record sales, review expenses, and check profit or loss."
                emoji="💰"
                onClick={() => router.push("/finance")}
              />
            </div>

            <div data-tour="dashboard-events-card">
              <QuickActionCard
                title="Events"
                subtitle="Review farm-wide event history and recorded pig activities."
                emoji="📅"
                onClick={() => router.push("/events")}
              />
            </div>

            <div data-tour="dashboard-feed-card">
              <QuickActionCard
                title="Feed Inventory"
                subtitle="Manage feed types, purchases, and feed usage."
                emoji="🌾"
                onClick={() => router.push("/feed")}
              />
            </div>

            <div data-tour="dashboard-bulk-events-card">
              <QuickActionCard
                title="Bulk Events"
                subtitle="Record one event for multiple pigs at the same time."
                emoji="📦"
                onClick={() => router.push("/bulk-events")}
              />
            </div>

            <div data-tour="dashboard-farm-setup-card">
              <QuickActionCard
                title="Farm Setup"
                subtitle="Manage farm information, preferences, and settings."
                emoji="⚙️"
                onClick={() => router.push("/farm-setup")}
              />
            </div>

            <div data-tour="dashboard-reports-card">
              <QuickActionCard
                title="View Reports"
                subtitle="Open reports and review farm performance trends."
                emoji="📊"
                onClick={() => router.push("/reports")}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Sales
                </h2>
                <p className="text-sm text-gray-600">
                  A quick look at your latest revenue activity.
                </p>
              </div>
              <button
                onClick={() => router.push("/finance")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                Open Finance
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {finance?.recentSales?.length ? (
                finance.recentSales.map((sale) => (
                  <div key={sale.id} className="rounded-xl border p-4">
                    <div className="font-semibold text-gray-900">
                      {sale.pig?.tagNumber ?? "General Sale"}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Buyer: {sale.buyerName ?? "-"}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </div>
                    <div className="mt-2 font-semibold text-gray-900">
                      KES {sale.totalAmount.toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-5 text-sm text-gray-500">
                  No sales recorded yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
