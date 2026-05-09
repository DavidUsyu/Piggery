"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, hasClientAuthState } from "@/lib/api";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatDate } from "@/lib/dates";

type PigStageName =
  | "Piglet"
  | "Weaner"
  | "Grower"
  | "Finisher"
  | "No Birth Date";

type PigStageData = {
  stage: PigStageName;
  count: number;
};

function getPigStage(birthDate: string | null): PigStageName {
  if (!birthDate) return "No Birth Date";

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "No Birth Date";

  const ageDays = Math.max(
    1,
    Math.floor((Date.now() - birth.getTime()) / 86400000),
  );

  if (ageDays <= 28) return "Piglet";
  if (ageDays <= 84) return "Weaner";
  if (ageDays <= 132) return "Grower";
  return "Finisher";
}

function exportExcel({ expenses, sales, pigStages }: any) {
  const workbook = XLSX.utils.book_new();

  const pigStageSheet = XLSX.utils.json_to_sheet(
    pigStages.map((item: PigStageData) => ({
      Stage: item.stage,
      Pigs: item.count,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, pigStageSheet, "Pig Stages");

  // Expenses sheet
  const expenseData = expenses.map((e: any) => ({
    Date: formatDate(e.expenseDate),
    Category: e.category,
    Amount: Number(e.amount),
    Description: e.description || "",
  }));

  const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");

  // Sales sheet
  const salesData = sales.map((s: any) => ({
    Date: formatDate(s.saleDate),
    Quantity: s.quantity,
    Total: Number(s.totalAmount ?? s.totalPrice ?? 0),
    Buyer: s.buyerName || "",
  }));

  const salesSheet = XLSX.utils.json_to_sheet(salesData);
  XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales");

  // Download
  const file = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  saveAs(
    new Blob([file], { type: "application/octet-stream" }),
    "farm-report.xlsx"
  );
}
function exportPDF({ expenses, sales, pigStages }: any) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Farm Report", 14, 15);

  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(new Date())}`, 14, 22);

  autoTable(doc, {
    startY: 30,
    head: [["Stage", "Pigs"]],
    body: pigStages.map((item: PigStageData) => [item.stage, item.count]),
  });

  // Expenses Table
  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30) + 10,
    head: [["Date", "Category", "Amount", "Description"]],
    body: expenses.map((e: any) => [
      formatDate(e.expenseDate),
      e.category,
      `KES ${Number(e.amount).toLocaleString()}`,
      e.description || "-",
    ]),
  });

  // Sales Table
  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30) + 10,
    head: [["Date", "Quantity", "Total", "Buyer"]],
    body: sales.map((s: any) => [
      formatDate(s.saleDate),
      s.quantity,
      `KES ${Number(s.totalAmount ?? s.totalPrice ?? 0).toLocaleString()}`,
      s.buyerName || "-",
    ]),
  });

  doc.save("farm-report.pdf");
}

type Pig = {
  id: string;
  tagNumber: string;
  sex: string;
  status: string;
  pregnancyStatus: string;
  birthDate: string | null;
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

type Expense = {
  id: string;
  category: string;
  amount: number;
  expenseDate: string;
};

type PigEvent = {
  id: string;
  pigId: string;
  type: string;
  eventDate: string;
  weightKg: number | null;
  cost: number | null;
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

export default function ReportsPage() {
  const router = useRouter();

  const [pigs, setPigs] = useState<Pig[]>([]);
  const [events, setEvents] = useState<PigEvent[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [pigsData, eventsData, financeData, expensesData] =
        await Promise.all([
          apiGet<Pig[]>("/pigs"),
          apiGet<PigEvent[]>("/events"),
          apiGet<FinanceSummary>("/finance/summary"),
          apiGet<Expense[]>("/finance/expenses"),
        ]);

      setPigs(pigsData);
      setEvents(eventsData);
      setFinance(financeData);
      setExpenses(expensesData);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasClientAuthState()) {
      router.push("/login");
      return;
    }

    loadData();
  }, [router]);

  const activePigs = useMemo(
    () => pigs.filter((pig) => pig.status === "ACTIVE"),
    [pigs],
  );

  const femalePigs = useMemo(
    () => pigs.filter((pig) => pig.sex === "FEMALE"),
    [pigs],
  );

  const pregnantPigs = useMemo(
    () =>
      pigs.filter(
        (pig) =>
          pig.sex === "FEMALE" && pig.pregnancyStatus === "PREGNANT",
      ),
    [pigs],
  );

  const returnedToHeatPigs = useMemo(
    () =>
      pigs.filter(
        (pig) =>
          pig.sex === "FEMALE" &&
          pig.pregnancyStatus === "RETURNED_TO_HEAT",
      ),
    [pigs],
  );

  const weightEvents = useMemo(
    () => events.filter((event) => event.type === "WEIGHT" && event.weightKg !== null),
    [events],
  );

  const pigStageChartData = useMemo<PigStageData[]>(() => {
    const counts = new Map<PigStageName, number>([
      ["Piglet", 0],
      ["Weaner", 0],
      ["Grower", 0],
      ["Finisher", 0],
      ["No Birth Date", 0],
    ]);

    for (const pig of activePigs) {
      const stage = getPigStage(pig.birthDate);
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([stage, count]) => ({
      stage,
      count,
    }));
  }, [activePigs]);

  const eventTypeChartData = useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of events) {
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({
        name: formatEventType(type),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const expenseBreakdownData = useMemo(() => {
    return finance?.expenseBreakdown?.map((item) => ({
      name: item.category,
      amount: item.amount,
    })) ?? [];
  }, [finance]);

  const monthlyExpenseData = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const expense of expenses) {
      const date = new Date(expense.expenseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      grouped.set(key, (grouped.get(key) ?? 0) + expense.amount);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, amount]) => ({
        month,
        amount,
      }));
  }, [expenses]);

  const weightTrendData = useMemo(() => {
    const grouped = new Map<string, number[]>();

    for (const event of weightEvents) {
      const date = new Date(event.eventDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      const arr = grouped.get(key) ?? [];
      arr.push(event.weightKg ?? 0);
      grouped.set(key, arr);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, weights]) => ({
        month,
        avgWeight:
          weights.length > 0
            ? Number(
                (weights.reduce((sum, value) => sum + value, 0) / weights.length).toFixed(1),
              )
            : 0,
      }));
  }, [weightEvents]);

  const topEventType = useMemo(() => {
    return eventTypeChartData.length > 0 ? eventTypeChartData[0] : null;
  }, [eventTypeChartData]);

  if (loading) {
    return <div className="p-6">Loading reports...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Reports</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Farm Reports
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Review pig performance, farm activity, and financial trends.
              </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    onClick={() =>
                      exportPDF({
                        expenses,
                        sales: finance?.recentSales ?? [],
                        pigStages: pigStageChartData,
                      })
                    }
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                  >
                    Download PDF
                  </button>

                  <button
                    onClick={() =>
                      exportExcel({
                        expenses,
                        sales: finance?.recentSales ?? [],
                        pigStages: pigStageChartData,
                      })
                    }
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                  >
                    Download Excel
                  </button>
                </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
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
            label="Active Pigs"
            value={String(activePigs.length)}
            helper={`${pigs.length} total pigs`}
          />
          <SummaryCard
            label="Pregnant Pigs"
            value={String(pregnantPigs.length)}
            helper={`${femalePigs.length} female pigs`}
          />
          <SummaryCard
            label="Net Profit"
            value={`KES ${(finance?.netProfit ?? 0).toLocaleString()}`}
            helper={finance?.status ?? "No data"}
          />
          <SummaryCard
            label="Top Event Type"
            value={topEventType?.name ?? "No data"}
            helper={
              topEventType ? `${topEventType.count} record(s)` : "No event data"
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Pig Overview"
            subtitle="Quick overview of your farm population."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">All Pigs</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {pigs.length}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Female Pigs</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {femalePigs.length}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Pregnant</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {pregnantPigs.length}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Returned to Heat</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {returnedToHeatPigs.length}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Finance Snapshot"
            subtitle="Quick financial summary from your current records."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Revenue</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  KES {(finance?.totalRevenue ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Expenses</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  KES {(finance?.totalExpenses ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Sales Recorded</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {finance?.saleCount ?? 0}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Expenses Recorded</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {finance?.expenseCount ?? 0}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Pig Stages"
          subtitle="Active pigs grouped by age stage using the current farm stage rules."
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="h-80">
              {pigStageChartData.every((item) => item.count === 0) ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">
                  No active pig stage data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pigStageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Pigs" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {pigStageChartData.map((item) => (
                <div
                  key={item.stage}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {item.stage}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Event Activity"
            subtitle="See which types of events are most common."
          >
            <div className="h-80">
              {eventTypeChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">
                  No event data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Expense Breakdown"
            subtitle="Compare farm costs by category."
          >
            <div className="h-80">
              {expenseBreakdownData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">
                  No expense data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Monthly Expense Trend"
            subtitle="Track how expenses change over time."
          >
            <div className="h-80">
              {monthlyExpenseData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">
                  No monthly expense data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Average Weight Trend"
            subtitle="Average recorded weight by month."
          >
            <div className="h-80">
              {weightTrendData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">
                  No weight data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgWeight" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Recent Sales"
          subtitle="Latest sales captured in finance."
        >
          {finance?.recentSales?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Pig
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">
                      Buyer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {finance.recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="px-3 py-3 text-gray-900">
                        {sale.pig?.tagNumber ?? "General Sale"}
                      </td>
                      <td className="px-3 py-3 text-gray-900">
                        KES {sale.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-gray-900">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-3 py-3 text-gray-900">
                        {sale.buyerName ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
              No recent sales yet.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function formatEventType(type: string) {
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
  if (type === "TREATMENT") return "Treatment";
  if (type === "SALE") return "Sale";
  if (type === "NOTE") return "Note";
  if (type === "DEATH") return "Death";
  if (type === "CONSUMED") return "Consumed";
  return type;
}
