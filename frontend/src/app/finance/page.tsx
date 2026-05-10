"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, hasClientAuthState } from "@/lib/api";
import { formatDate } from "@/lib/dates";

type Pig = {
  id: string;
  tagNumber: string;
  name: string | null;
};

type Summary = {
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
  description?: string | null;
  vendor?: string | null;
  eventId?: string | null;
  pig?: {
    id: string;
    tagNumber: string;
    name?: string | null;
  } | null;
};


const EXPENSE_CATEGORIES = [
  "FEED",
  "LABOR",
  "UTILITIES",
  "MAINTENANCE",
  "PURCHASE",
  "OTHER",
];

function getExpenseSourceLabel(expense: Expense) {
  if (expense.eventId) return "Auto from event";

  const description = (expense.description ?? "").toLowerCase();

  if (expense.category === "FEED" && description.startsWith("feed purchase -")) {
    return "Auto from feed purchase";
  }

  return "Manual";
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
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-gray-500">{helper}</div> : null}
    </div>
  );
}

export default function FinancePage() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saleForm, setSaleForm] = useState({
    pigId: "",
    quantity: 1,
    unitPrice: "",
    saleDate: "",
    buyerName: "",
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    pigId: "",
    category: "FEED",
    amount: "",
    expenseDate: "",
    description: "",
    vendor: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, pigsData, expensesData] = await Promise.all([
        apiGet<Summary>("/finance/summary"),
        apiGet<Pig[]>("/pigs"),
        apiGet<Expense[]>("/finance/expenses"),
      ]);

      setSummary(summaryData);
      setPigs(pigsData);
      setExpenses(expensesData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load finance data");
      }
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

  async function handleCreateSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmittingSale(true);
      setError(null);

      await apiPost("/finance/sales", {
        pigId: saleForm.pigId || undefined,
        quantity: Number(saleForm.quantity),
        unitPrice: Number(saleForm.unitPrice),
        saleDate: saleForm.saleDate || undefined,
        buyerName: saleForm.buyerName || undefined,
        notes: saleForm.notes || undefined,
      });

      setSaleForm({
        pigId: "",
        quantity: 1,
        unitPrice: "",
        saleDate: "",
        buyerName: "",
        notes: "",
      });

      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create sale");
      }
    } finally {
      setSubmittingSale(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmittingExpense(true);
      setError(null);

      await apiPost("/finance/expenses", {
        pigId: expenseForm.pigId || undefined,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        expenseDate: expenseForm.expenseDate || undefined,
        description: expenseForm.description || undefined,
        vendor: expenseForm.vendor || undefined,
      });

      setExpenseForm({
        pigId: "",
        category: "FEED",
        amount: "",
        expenseDate: "",
        description: "",
        vendor: "",
      });

      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create expense");
      }
    } finally {
      setSubmittingExpense(false);
    }
  }

  const topExpense = useMemo(() => {
    if (!summary?.expenseBreakdown?.length) return null;
    return [...summary.expenseBreakdown].sort((a, b) => b.amount - a.amount)[0];
  }, [summary]);

  if (loading) {
    return <div className="p-6">Loading finance...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Finance</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Finance Overview
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Track sales, farm expenses, and profit or loss in one place.
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
            >
              ← Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
        </div>

        {summary && (
          <div data-tour="finance-summary-section">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Revenue"
                value={`KES ${summary.totalRevenue.toLocaleString()}`}
                helper={`${summary.saleCount} sale record${summary.saleCount === 1 ? "" : "s"}`}
              />
              <SummaryCard
                label="Total Expenses"
                value={`KES ${summary.totalExpenses.toLocaleString()}`}
                helper={`${summary.expenseCount} expense record${summary.expenseCount === 1 ? "" : "s"}`}
              />
              <SummaryCard
                label="Net Result"
                value={`KES ${summary.netProfit.toLocaleString()}`}
                helper={summary.status}
              />
              <SummaryCard
                label="Top Expense"
                value={topExpense ? topExpense.category : "No data"}
                helper={
                  topExpense
                    ? `KES ${topExpense.amount.toLocaleString()}`
                    : "Record expenses to see this"
                }
              />
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Record Sale</h2>
              <p className="mt-1 text-sm text-gray-600">
                Save income from pigs sold.
              </p>
            </div>

            <form onSubmit={handleCreateSale} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pig
                </label>
                <select
                  value={saleForm.pigId}
                  onChange={(e) =>
                    setSaleForm((prev) => ({ ...prev, pigId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-3 text-gray-900"
                >
                  <option value="">Select pig (optional)</option>
                  {pigs.map((pig) => (
                    <option key={pig.id} value={pig.id}>
                      {pig.tagNumber}
                      {pig.name ? ` - ${pig.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={saleForm.quantity}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        quantity: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    value={saleForm.unitPrice}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        unitPrice: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Sale Date
                  </label>
                  <input
                    type="date"
                    value={saleForm.saleDate}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        saleDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter buyer name"
                    value={saleForm.buyerName}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        buyerName: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  placeholder="Add notes"
                  value={saleForm.notes}
                  onChange={(e) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="min-h-30 w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <button
                className="rounded-xl border px-4 py-3 font-medium text-black disabled:opacity-60"
                disabled={submittingSale}
                type="submit"
              >
                {submittingSale ? "Saving..." : "Save Sale"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Add Farm Expense
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Record general costs like feed, labor, maintenance, or utilities.
              </p>
            </div>

            <form onSubmit={handleCreateExpense} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pig
                </label>
                <select
                  value={expenseForm.pigId}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      pigId: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-3 py-3 text-gray-900"
                >
                  <option value="">Select pig (optional)</option>
                  {pigs.map((pig) => (
                    <option key={pig.id} value={pig.id}>
                      {pig.tagNumber}
                      {pig.name ? ` - ${pig.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        expenseDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="Enter vendor"
                    value={expenseForm.vendor}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        vendor: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  placeholder="Describe this expense"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-30 w-full rounded-xl border px-3 py-3 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <button
                className="rounded-xl border px-4 py-3 font-medium text-black disabled:opacity-60"
                disabled={submittingExpense}
                type="submit"
              >
                {submittingExpense ? "Saving..." : "Save Expense"}
              </button>
            </form>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Sales
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Latest revenue activity.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!summary || summary.recentSales.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                  No sales recorded yet.
                </div>
              ) : (
                summary.recentSales.map((sale) => (
                  <div key={sale.id} className="rounded-xl border p-4">
                    <div className="font-semibold text-gray-900">
                      {sale.pig?.tagNumber ?? "General Sale"}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      KES {sale.totalAmount.toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatDate(sale.saleDate)}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Buyer: {sale.buyerName ?? "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Expense Breakdown
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                See which categories are taking the most money.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {!summary || summary.expenseBreakdown.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                  No expenses recorded yet.
                </div>
              ) : (
                [...summary.expenseBreakdown]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <span className="font-medium text-gray-900">
                        {item.category}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        KES {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Expenses</h2>
            <p className="mt-1 text-sm text-gray-600">
              Auto-synced event expenses, feed purchase expenses, and manual farm expenses.
            </p>
          </div>

          {expenses.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed p-6 text-center text-gray-500 md:hidden">
              No expenses recorded yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3 md:hidden">
              {expenses.map((expense) => (
                <div key={expense.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {expense.category}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {formatDate(expense.expenseDate)}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-gray-900">
                      KES {expense.amount.toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-700">
                    <div>Pig: {expense.pig?.tagNumber ?? "-"}</div>
                    <div>Vendor: {expense.vendor ?? "-"}</div>
                    <div>Description: {expense.description ?? "-"}</div>
                  </div>

                  <div className="mt-3">
                    <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                      {getExpenseSourceLabel(expense)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-225 w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Pig
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Vendor
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      No expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="border-b align-top">
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {expense.category}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        KES {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {expense.pig?.tagNumber ?? "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {expense.vendor ?? "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {expense.description ?? "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                          {getExpenseSourceLabel(expense)}
                        </span>
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
