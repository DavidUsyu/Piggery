"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, hasClientAuthState } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";

type Pig = {
  id: string;
  tagNumber: string;
};

type PigEvent = {
  id: string;
  pigId: string;
  type: string;
  eventDate: string;
  weightKg: number | null;
  medicine: string | null;
  dose: string | null;
  cost: number | null;
  notes: string | null;
  boarId: string | null;
  pigletsBorn: number | null;
  stillBorn: number | null;
  pregnancyCheckResult: string | null;
};

function pregnancyStatusLabel(status: string) {
  if (status === "NOT_PREGNANT") return "Not Pregnant";
  if (status === "PREGNANT") return "Pregnant";
  if (status === "RETURNED_TO_HEAT") return "Returned to Heat";
  return status;
}

function eventLabel(type: string) {
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
  if (type === "DEATH") return "Death";
  if (type === "CONSUMED") return "Consumed";
  if (type === "NOTE") return "Note";
  if (type === "ILLNESS") return "Illness";
  return type;
}

const EVENT_TYPES = [
  "WEIGHT",
  "VACCINATION",
  "DEWORMING",
  "TEETH_CLIPPING",
  "TAIL_DOCKING",
  "CASTRATION",
  "IRON_INJECTION",
  "BREEDING",
  "PREGNANCY_CHECK",
  "FARROWING",
  "WEANING",
  "TREATMENT",
  "SALE",
  "DEATH",
  "CONSUMED",
  "NOTE",
];

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

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<PigEvent[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPigId, setSelectedPigId] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasClientAuthState()) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [eventsData, pigsData] = await Promise.all([
          apiGet<PigEvent[]>("/events"),
          apiGet<Pig[]>("/pigs"),
        ]);

        setEvents(eventsData);
        setPigs(pigsData);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load events");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const pigMap = useMemo(() => {
    return new Map(pigs.map((p) => [p.id, p.tagNumber]));
  }, [pigs]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return events.filter((event) => {
      const pigTag = pigMap.get(event.pigId)?.toLowerCase() ?? "";
      const typeLabel = eventLabel(event.type).toLowerCase();
      const notes = (event.notes ?? "").toLowerCase();
      const medicine = (event.medicine ?? "").toLowerCase();

      const pigMatch = selectedPigId === "ALL" || event.pigId === selectedPigId;
      const typeMatch = selectedType === "ALL" || event.type === selectedType;
      const searchMatch =
        normalizedSearch.length === 0 ||
        pigTag.includes(normalizedSearch) ||
        typeLabel.includes(normalizedSearch) ||
        notes.includes(normalizedSearch) ||
        medicine.includes(normalizedSearch);

      return pigMatch && typeMatch && searchMatch;
    });
  }, [events, selectedPigId, selectedType, search, pigMap]);

  const totalEvents = events.length;
  const weightEvents = events.filter((e) => e.type === "WEIGHT").length;
  const vaccinationEvents = events.filter((e) => e.type === "VACCINATION").length;
  const treatmentEvents = events.filter((e) => e.type === "TREATMENT").length;

  if (loading) {
    return <div className="p-6">Loading events...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Events</div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Farm Events
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Review farm activity, filter event history, and open pigs that need attention.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                type="button"
              >
                Back to Dashboard
              </button>

              <button
                onClick={() => router.push("/pigs")}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                type="button"
              >
                Go to Pigs
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Events"
            value={String(totalEvents)}
            helper="All recorded farm activity"
          />
          <SummaryCard
            label="Weight Records"
            value={String(weightEvents)}
            helper="Growth tracking events"
          />
          <SummaryCard
            label="Vaccinations"
            value={String(vaccinationEvents)}
            helper="Health prevention events"
          />
          <SummaryCard
            label="Treatments"
            value={String(treatmentEvents)}
            helper="Care and treatment events"
          />
        </div>

        <SectionCard
          title="Filter Events"
          subtitle="Find events by pig, type, or keyword."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <input
              type="text"
              placeholder="Search by pig, type, medicine, or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-500"
            />

            <select
              value={selectedPigId}
              onChange={(e) => setSelectedPigId(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-gray-900"
            >
              <option value="ALL">All Pigs</option>
              {pigs.map((pig) => (
                <option key={pig.id} value={pig.id}>
                  {pig.tagNumber}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-gray-900"
            >
              <option value="ALL">All Event Types</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {eventLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>

        <SectionCard
          title="Event History"
          subtitle={`${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} found`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Pig
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Event
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Details
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      No events found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b align-top">
                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {pigMap.get(event.pigId) ?? event.pigId}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {eventLabel(event.type)}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-gray-900">
                        {formatDateTime(event.eventDate)}
                      </td>

                      <td className="px-3 py-3 text-gray-900">
                        <div className="flex flex-wrap gap-2">
                          {event.weightKg !== null && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Weight: {event.weightKg} kg
                            </span>
                          )}

                          {event.medicine && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Medicine: {event.medicine}
                            </span>
                          )}

                          {event.dose && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Dose: {event.dose}
                            </span>
                          )}

                          {event.cost !== null && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Cost: KES {event.cost.toLocaleString()}
                            </span>
                          )}

                          {event.boarId && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Boar ID: {event.boarId}
                            </span>
                          )}

                          {event.pigletsBorn !== null && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Piglets Born: {event.pigletsBorn}
                            </span>
                          )}

                          {event.stillBorn !== null && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Stillborn: {event.stillBorn}
                            </span>
                          )}

                          {event.pregnancyCheckResult && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Result: {pregnancyStatusLabel(event.pregnancyCheckResult)}
                            </span>
                          )}

                          {event.notes && (
                            <span className="rounded-full border px-3 py-1 text-xs text-gray-900">
                              Notes: {event.notes}
                            </span>
                          )}

                          {event.weightKg === null &&
                            !event.medicine &&
                            !event.dose &&
                            event.cost === null &&
                            !event.boarId &&
                            event.pigletsBorn === null &&
                            event.stillBorn === null &&
                            !event.pregnancyCheckResult &&
                            !event.notes && (
                              <span className="text-gray-500">—</span>
                            )}
                        </div>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/pigs/${event.pigId}`)}
                          className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                          type="button"
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
        </SectionCard>
      </div>
    </div>
  );
}
