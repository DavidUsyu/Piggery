"use client";
const EVENT_COST_CONFIG: Record<
  string,
  { showCost: boolean; costLabel: string; placeholder: string }
> = {
  VACCINATION: {
    showCost: true,
    costLabel: "Vaccination Cost",
    placeholder: "Enter vaccination cost",
  },
  DEWORMING: {
    showCost: true,
    costLabel: "Deworming Cost",
    placeholder: "Enter deworming cost",
  },
  TREATMENT: {
    showCost: true,
    costLabel: "Treatment Cost",
    placeholder: "Enter treatment cost",
  },
  BREEDING: {
    showCost: true,
    costLabel: "Breeding Cost",
    placeholder: "Enter breeding cost",
  },
  SALE: {
    showCost: true,
    costLabel: "Sale Amount",
    placeholder: "Enter selling price",
  },
  WEIGHT: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  PREGNANCY_CHECK: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  FARROWING: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  WEANING: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  ILLNESS: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  DEATH: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  CONSUMED: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
  NOTE: {
    showCost: false,
    costLabel: "",
    placeholder: "",
  },
};


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

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
  if (type === "BREEDING") return "Breeding";
  if (type === "PREGNANCY_CHECK") return "Pregnancy Check";
  if (type === "FARROWING") return "Farrowing";
  if (type === "WEANING") return "Weaning";
  if (type === "TREATMENT") return "Treatment";
  if (type === "SALE") return "Sale";
  if (type === "DEATH") return "Death";
  if (type === "CONSUMED") return "Consumed";
  if (type === "NOTE") return "Note";
  return type;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<PigEvent[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPigId, setSelectedPigId] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Event creation modal state
  const [showModal, setShowModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    pigId: "",
    type: "WEIGHT",
    eventDate: new Date().toISOString().slice(0, 16),
    weightKg: "",
    medicine: "",
    dose: "",
    cost: "",
    notes: "",
  });

  const selectedConfig = EVENT_COST_CONFIG[eventForm.type] ?? {
    showCost: false,
    costLabel: "",
    placeholder: "",
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        setError(null);

        const [eventsData, pigsData] = await Promise.all([
          apiGet<PigEvent[]>("/events"),
          apiGet<Pig[]>("/pigs"),
        ]);

        setEvents(eventsData);
        setPigs(pigsData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load events");
      }
    }

    load();
  }, [router]);

  const pigMap = useMemo(() => {
    return new Map(pigs.map((p) => [p.id, p.tagNumber]));
  }, [pigs]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const pigMatch = selectedPigId === "ALL" || event.pigId === selectedPigId;
      const typeMatch = selectedType === "ALL" || event.type === selectedType;
      return pigMatch && typeMatch;
    });
  }, [events, selectedPigId, selectedType]);

  const totalEvents = events.length;
  const weightEvents = events.filter((e) => e.type === "WEIGHT").length;
  const vaccinationEvents = events.filter((e) => e.type === "VACCINATION").length;
  const breedingEvents = events.filter((e) => e.type === "BREEDING").length;

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Events</h1>
            <p className="mt-2 text-sm text-gray-500">
              Farm-wide event history across all pigs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl border px-4 py-2"
              onClick={() => setShowModal(true)}
            >
              Add Event
            </button>
            <button
              className="rounded-2xl border px-4 py-2"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </button>
            <button
              className="rounded-2xl border px-4 py-2"
              onClick={() => router.push("/pigs")}
            >
              Go to Pigs
            </button>
          </div>
        </div>

        {/* Event Creation Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold mb-4">Add Pig Event</h2>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  // TODO: Implement event creation logic
                  setShowModal(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Pig</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={eventForm.pigId}
                    onChange={e => setEventForm(prev => ({ ...prev, pigId: e.target.value }))}
                    required
                  >
                    <option value="">Select Pig</option>
                    {pigs.map(pig => (
                      <option key={pig.id} value={pig.id}>{pig.tagNumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Event Type</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={eventForm.type}
                    onChange={e => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    {Object.keys(EVENT_COST_CONFIG).map(type => (
                      <option key={type} value={type}>{eventLabel(type)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Event Date</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded-lg px-3 py-2"
                    value={eventForm.eventDate}
                    onChange={e => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))}
                  />
                </div>
                {/* Render cost input if needed */}
                {selectedConfig.showCost && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {selectedConfig.costLabel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={selectedConfig.placeholder}
                      value={eventForm.cost}
                      onChange={e => setEventForm(prev => ({ ...prev, cost: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will automatically sync to Finance.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    value={eventForm.notes}
                    onChange={e => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Total Events</div>
            <div className="mt-2 text-3xl font-semibold">{totalEvents}</div>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Weight Records</div>
            <div className="mt-2 text-3xl font-semibold">{weightEvents}</div>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Vaccinations</div>
            <div className="mt-2 text-3xl font-semibold">{vaccinationEvents}</div>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm text-gray-500">Breeding Events</div>
            <div className="mt-2 text-3xl font-semibold">{breedingEvents}</div>
          </div>
        </div>

        <section className="rounded-2xl border p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Activity Timeline</h2>
              <p className="mt-1 text-sm text-gray-500">
                Filter by pig or event type to review farm activity.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                className="rounded-xl border p-3 text-sm"
                value={selectedPigId}
                onChange={(e) => setSelectedPigId(e.target.value)}
              >
                <option value="ALL">All Pigs</option>
                {pigs.map((pig) => (
                  <option key={pig.id} value={pig.id}>
                    {pig.tagNumber}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="ALL">All Event Types</option>
                <option value="WEIGHT">WEIGHT</option>
                <option value="VACCINATION">VACCINATION</option>
                <option value="DEWORMING">DEWORMING</option>
                <option value="BREEDING">BREEDING</option>
                <option value="PREGNANCY_CHECK">PREGNANCY_CHECK</option>
                <option value="FARROWING">FARROWING</option>
                <option value="WEANING">WEANING</option>
                <option value="TREATMENT">TREATMENT</option>
                <option value="SALE">SALE</option>
                <option value="DEATH">DEATH</option>
                <option value="CONSUMED">CONSUMED</option>
                <option value="NOTE">NOTE</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border">
            <table className="min-w-[1300px] w-full table-auto text-sm">
              <thead>
                <tr className="border-b">
                  <th className="min-w-[120px] px-4 py-3 text-left">Pig</th>
                  <th className="min-w-[180px] px-4 py-3 text-left">Event</th>
                  <th className="min-w-[160px] px-4 py-3 text-left">Date</th>
                  <th className="min-w-[420px] px-4 py-3 text-left">Details</th>
                  <th className="min-w-[120px] px-4 py-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-gray-500">
                      No events found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {pigMap.get(event.pigId) ?? event.pigId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {eventLabel(event.type)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(event.eventDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="space-y-1">
                          {event.weightKg !== null && (
                            <div>Weight: {event.weightKg} kg</div>
                          )}

                          {event.medicine && (
                            <div>Medicine: {event.medicine}</div>
                          )}

                          {event.dose && <div>Dose: {event.dose}</div>}

                          {event.cost !== null && <div>Cost: {event.cost}</div>}

                          {event.boarId && <div>Boar ID: {event.boarId}</div>}

                          {event.pigletsBorn !== null && (
                            <div>Piglets Born: {event.pigletsBorn}</div>
                          )}

                          {event.stillBorn !== null && (
                            <div>Stillborn: {event.stillBorn}</div>
                          )}

                          {event.pregnancyCheckResult && (
                            <div>
                              Result:{" "}
                              {pregnancyStatusLabel(event.pregnancyCheckResult)}
                            </div>
                          )}

                          {event.notes && <div>Notes: {event.notes}</div>}

                          {event.weightKg === null &&
                            !event.medicine &&
                            !event.dose &&
                            event.cost === null &&
                            !event.boarId &&
                            event.pigletsBorn === null &&
                            event.stillBorn === null &&
                            !event.pregnancyCheckResult &&
                            !event.notes && <div>—</div>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          className="rounded-xl border px-3 py-2 text-sm"
                          onClick={() => router.push(`/pigs/${event.pigId}`)}
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