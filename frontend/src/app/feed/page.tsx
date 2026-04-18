"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, hasClientAuthState } from "@/lib/api";

function formatNumber(value: string | number) {
  const num = Number(value);
  if (isNaN(num)) return "0";
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(2).replace(/\.?0+$/, "");
}

type FeedType = {
  id: string;
  name: string;
  unit: string;
};

type FeedPurchase = {
  id: string;
  quantityBought: string | number;
  quantityLeft: string | number;
  totalCost: string | number;
  purchaseDate: string;
  feedType: FeedType;
};

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

export default function FeedPage() {
  const router = useRouter();

  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [purchases, setPurchases] = useState<FeedPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [feedTypeForm, setFeedTypeForm] = useState({
    name: "",
    unit: "kg",
  });

  const [purchaseForm, setPurchaseForm] = useState({
    feedTypeId: "",
    quantityBought: "",
    totalCost: "",
  });

  const [usageForm, setUsageForm] = useState({
    feedTypeId: "",
    quantityUsed: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [types, purchasesData] = await Promise.all([
        apiGet<FeedType[]>("/feed/types"),
        apiGet<FeedPurchase[]>("/feed/purchases"),
      ]);

      setFeedTypes(types);
      setPurchases(purchasesData);
    } catch (err: any) {
      setError(err.message || "Failed to load feed data");
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

  async function createFeedType(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage("");

    try {
      await apiPost("/feed/types", feedTypeForm);
      setFeedTypeForm({ name: "", unit: "kg" });
      setMessage("Feed type created successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to create feed type");
    }
  }

  async function createPurchase(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage("");

    try {
      await apiPost("/feed/purchases", {
        feedTypeId: purchaseForm.feedTypeId,
        quantityBought: Number(purchaseForm.quantityBought),
        totalCost: Number(purchaseForm.totalCost),
      });

      setPurchaseForm({
        feedTypeId: "",
        quantityBought: "",
        totalCost: "",
      });

      setMessage("Feed purchase added successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to add feed purchase");
    }
  }

  async function recordUsage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage("");

    try {
      await apiPost("/feed/usage", {
        feedTypeId: usageForm.feedTypeId,
        quantityUsed: Number(usageForm.quantityUsed),
      });

      setUsageForm({
        feedTypeId: "",
        quantityUsed: "",
      });

      setMessage("Feed usage recorded successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to record feed usage");
    }
  }

  const totalStock = useMemo(() => {
    const map = new Map<string, number>();

    purchases.forEach((p) => {
      const unit = p.feedType.unit;
      const value = Number(p.quantityLeft);
      map.set(unit, (map.get(unit) || 0) + value);
    });

    return Array.from(map.entries())
      .map(([unit, total]) => `${formatNumber(total)} ${unit}`)
      .join(" • ");
  }, [purchases]);

  if (loading) {
    return <div className="p-6">Loading feed...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Feed Inventory</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage feed stock and usage on your farm
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              type="button"
            >
              Back to Dashboard
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">
              {message}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Feed Types" value={String(feedTypes.length)} />
          <SummaryCard label="Stock Entries" value={String(purchases.length)} />
          <SummaryCard label="Total Stock" value={totalStock || "0"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Add Feed Type"
            subtitle="Create your own feed names"
          >
            <div data-tour="feed-add-type-section">
              <form onSubmit={createFeedType} className="space-y-4">
                <input
                  placeholder="Feed name"
                  value={feedTypeForm.name}
                  onChange={(e) =>
                    setFeedTypeForm({
                      ...feedTypeForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  required
                />

                <select
                  value={feedTypeForm.unit}
                  onChange={(e) =>
                    setFeedTypeForm({
                      ...feedTypeForm,
                      unit: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                >
                  <option value="kg">kg</option>
                  <option value="bags">bags</option>
                  <option value="sacks">sacks</option>
                </select>

                <button
                  className="rounded-xl bg-black px-4 py-3 font-medium text-white"
                  type="submit"
                >
                  Save Feed Type
                </button>
              </form>
            </div>
          </SectionCard>

          <SectionCard
            title="Add Feed Purchase"
            subtitle="Add new stock"
          >
            <div data-tour="feed-purchase-section">
              <form onSubmit={createPurchase} className="space-y-4">
                <select
                  value={purchaseForm.feedTypeId}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      feedTypeId: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  required
                >
                  <option value="">Select feed</option>
                  {feedTypes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.unit})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Quantity bought"
                  value={purchaseForm.quantityBought}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      quantityBought: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  required
                />

                <input
                  type="number"
                  placeholder="Total cost"
                  value={purchaseForm.totalCost}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      totalCost: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                  required
                />

                <button
                  className="rounded-xl bg-black px-4 py-3 font-medium text-white"
                  type="submit"
                >
                  Save Purchase
                </button>
              </form>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Record Feed Usage"
          subtitle="Deduct feed from stock"
        >
          <div data-tour="feed-usage-section">
            <form onSubmit={recordUsage} className="space-y-4">
              <select
                value={usageForm.feedTypeId}
                onChange={(e) =>
                  setUsageForm({
                    ...usageForm,
                    feedTypeId: e.target.value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
                required
              >
                <option value="">Select feed</option>
                {feedTypes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.unit})
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Quantity used"
                value={usageForm.quantityUsed}
                onChange={(e) =>
                  setUsageForm({
                    ...usageForm,
                    quantityUsed: e.target.value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
                required
              />

              <button
                className="rounded-xl bg-black px-4 py-3 font-medium text-white"
                type="submit"
              >
                Record Usage
              </button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          title="Current Feed Stock"
          subtitle="View your inventory"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Feed
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Bought
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Cost
                  </th>
                </tr>
              </thead>

              <tbody>
                {purchases.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-3 text-gray-900">
                      {item.feedType.name}
                    </td>

                    <td className="px-3 py-3 text-gray-900">
                      {formatNumber(item.quantityBought)} {item.feedType.unit}
                    </td>

                    <td className="px-3 py-3 text-gray-900">
                      KES {Math.round(Number(item.totalCost)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
