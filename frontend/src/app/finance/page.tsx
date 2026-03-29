"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

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
    } catch (err: any) {
      setError(err?.message ?? "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
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
    } catch (err: any) {
      setError(err?.message ?? "Failed to create sale");
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
    } catch (err: any) {
      setError(err?.message ?? "Failed to create expense");
    } finally {
      setSubmittingExpense(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading finance...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-gray-600">
            Track revenue, expenses, and overall farm profit.
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-lg border"
          type="button"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            label="Total Revenue"
            value={`KES ${summary.totalRevenue.toLocaleString()}`}
          />
          <Card
            label="Total Expenses"
            value={`KES ${summary.totalExpenses.toLocaleString()}`}
          />
          <Card
            label="Net Result"
            value={`KES ${summary.netProfit.toLocaleString()}`}
          />
          <Card label="Status" value={summary.status} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleCreateSale}
          className="rounded-xl border p-5 space-y-4"
        >
          <h2 className="text-xl font-semibold">Record Sale</h2>

          <select
            value={saleForm.pigId}
            onChange={(e) =>
              setSaleForm((prev) => ({ ...prev, pigId: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select pig (optional)</option>
            {pigs.map((pig) => (
              <option key={pig.id} value={pig.id}>
                {pig.tagNumber}
                {pig.name ? ` - ${pig.name}` : ""}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={saleForm.quantity}
            onChange={(e) =>
              setSaleForm((prev) => ({
                ...prev,
                quantity: Number(e.target.value),
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price"
            value={saleForm.unitPrice}
            onChange={(e) =>
              setSaleForm((prev) => ({
                ...prev,
                unitPrice: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
            required
          />

          <input
            type="date"
            value={saleForm.saleDate}
            onChange={(e) =>
              setSaleForm((prev) => ({
                ...prev,
                saleDate: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Buyer name"
            value={saleForm.buyerName}
            onChange={(e) =>
              setSaleForm((prev) => ({
                ...prev,
                buyerName: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <textarea
            placeholder="Notes"
            value={saleForm.notes}
            onChange={(e) =>
              setSaleForm((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <button
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
            disabled={submittingSale}
            type="submit"
          >
            {submittingSale ? "Saving..." : "Save Sale"}
          </button>
        </form>

        <form
          onSubmit={handleCreateExpense}
          className="rounded-xl border p-5 space-y-4"
        >
          <h2 className="text-xl font-semibold">Record Expense</h2>

          <select
            value={expenseForm.pigId}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                pigId: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select pig (optional)</option>
            {pigs.map((pig) => (
              <option key={pig.id} value={pig.id}>
                {pig.tagNumber}
                {pig.name ? ` - ${pig.name}` : ""}
              </option>
            ))}
          </select>

          <select
            value={expenseForm.category}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                category: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={expenseForm.amount}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
            required
          />

          <input
            type="date"
            value={expenseForm.expenseDate}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                expenseDate: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Vendor"
            value={expenseForm.vendor}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                vendor: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <textarea
            placeholder="Description"
            value={expenseForm.description}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <button
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
            disabled={submittingExpense}
            type="submit"
          >
            {submittingExpense ? "Saving..." : "Save Expense"}
          </button>
        </form>
      </div>

      {summary && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border p-5">
            <h2 className="text-xl font-semibold mb-4">Recent Sales</h2>
            <div className="space-y-3">
              {summary.recentSales.length === 0 ? (
                <p className="text-gray-500">No sales recorded yet.</p>
              ) : (
                summary.recentSales.map((sale) => (
                  <div key={sale.id} className="border rounded-lg p-3">
                    <div className="font-medium">
                      {sale.pig?.tagNumber ?? "General Sale"}
                    </div>
                    <div className="text-sm text-gray-600">
                      KES {sale.totalAmount.toLocaleString()} •{" "}
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Buyer: {sale.buyerName ?? "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border p-5">
            <h2 className="text-xl font-semibold mb-4">Expense Breakdown</h2>
            <div className="space-y-3">
              {summary.expenseBreakdown.length === 0 ? (
                <p className="text-gray-500">No expenses recorded yet.</p>
              ) : (
                summary.expenseBreakdown.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <span>{item.category}</span>
                    <span className="font-semibold">
                      KES {item.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border p-5">
        <h2 className="text-xl font-semibold mb-4">All Expenses</h2>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Pig</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-b">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {expense.category}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      KES {expense.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {expense.pig?.tagNumber ?? "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {expense.vendor ?? "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {expense.description ?? "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {expense.eventId ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          Auto from event
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          Manual
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}