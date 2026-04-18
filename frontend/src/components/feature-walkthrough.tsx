"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type TourStep = {
  id: string;
  route: string;
  target: string;
  title: string;
  description: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard-pigs",
    route: "/dashboard",
    target: "dashboard-pigs-card",
    title: "Pig Management",
    description:
      "Start here to manage pigs, open the pig register, and track reproductive status.",
  },
  {
    id: "dashboard-finance",
    route: "/dashboard",
    target: "dashboard-finance-card",
    title: "Finance",
    description:
      "This is where you see expenses, sales, and profit or loss for the farm.",
  },
  {
    id: "dashboard-feed",
    route: "/dashboard",
    target: "dashboard-feed-card",
    title: "Feed Inventory",
    description:
      "Use this to add feed types, record purchases, track usage, and monitor remaining stock.",
  },
    {
      id: "dashboard-events",
      route: "/dashboard",
      target: "dashboard-events-card",
      title: "Events",
      description:
        "Use this to review farm-wide event history across your pigs.",
    },
    {
      id: "dashboard-bulk-events",
      route: "/dashboard",
      target: "dashboard-bulk-events-card",
      title: "Bulk Events",
      description:
        "Use this when you want to record one event for multiple pigs at once.",
    },
    {
      id: "dashboard-farm-setup",
      route: "/dashboard",
      target: "dashboard-farm-setup-card",
      title: "Farm Setup",
      description:
        "Manage your farm settings, preferences, and account-related information here.",
    },
  {
    id: "dashboard-reports",
    route: "/dashboard",
    target: "dashboard-reports-card",
    title: "Reports",
    description:
      "Reports help you review farm performance and download exports.",
  },
  {
    id: "pigs-add",
    route: "/pigs/all",
    target: "all-pigs-add-section",
    title: "Add a Pig",
    description:
      "Register a new pig here using its tag number, sex, breed, and birth date.",
  },
  {
    id: "pigs-list",
    route: "/pigs/all",
    target: "all-pigs-list-section",
    title: "Pig List",
    description:
      "This table shows all pigs and lets you open or edit a pig quickly.",
  },
  {
    id: "feed-add-type",
    route: "/feed",
    target: "feed-add-type-section",
    title: "Add Feed Type",
    description:
      "Create your own feed names here. These are not predefined.",
  },
  {
    id: "feed-purchase",
    route: "/feed",
    target: "feed-purchase-section",
    title: "Record Feed Purchase",
    description:
      "When you buy feed, record it here. It increases stock and also creates a finance expense.",
  },
  {
    id: "feed-usage",
    route: "/feed",
    target: "feed-usage-section",
    title: "Record Feed Usage",
    description:
      "When feed is used, record it here so the system deducts stock automatically.",
  },
  {
    id: "finance-summary",
    route: "/finance",
    target: "finance-summary-section",
    title: "Finance Overview",
    description:
      "Here you can review total revenue, total expenses, and net result.",
  },
];

function getRect(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

export default function FeatureWalkthrough() {
  const pathname = usePathname();
  const router = useRouter();

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const currentStep = useMemo(() => TOUR_STEPS[stepIndex] ?? null, [stepIndex]);

  function startTour() {
    setStepIndex(0);
    setRun(true);
  }

  useEffect(() => {
    const shouldStart = sessionStorage.getItem("start-walkthrough") === "true";
    if (!shouldStart) return;

    sessionStorage.removeItem("start-walkthrough");
    const timeoutId = window.setTimeout(() => {
      startTour();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleStart = () => {
      startTour();
    };

    window.addEventListener("start-feature-walkthrough", handleStart);
    return () => {
      window.removeEventListener("start-feature-walkthrough", handleStart);
    };
  }, []);

  useEffect(() => {
    if (!run || !currentStep) {
      const timeoutId = window.setTimeout(() => {
        setTargetRect(null);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (pathname !== currentStep.route) {
      router.push(currentStep.route);
      return;
    }

    let cancelled = false;

    const tryFindTarget = (attempt = 0) => {
      if (cancelled) return;

      const el = document.querySelector(
        `[data-tour="${currentStep.target}"]`,
      ) as HTMLElement | null;

      if (!el) {
        if (attempt < 10) {
          setTimeout(() => tryFindTarget(attempt + 1), 200);
        } else {
          setTargetRect(null);
        }
        return;
      }

      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setTimeout(() => {
        if (!cancelled) {
          setTargetRect(getRect(el));
        }
      }, 250);
    };

    tryFindTarget();

    const onReposition = () => {
      const el = document.querySelector(
        `[data-tour="${currentStep.target}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      setTargetRect(getRect(el));
    };

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition);
    };
  }, [run, currentStep, pathname, router]);

  if (!run || !currentStep) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setRun(false);
      setStepIndex(0);
      setTargetRect(null);
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  const back = () => {
    if (isFirst) return;
    setStepIndex((prev) => prev - 1);
  };

  const skip = () => {
    setRun(false);
    setStepIndex(0);
    setTargetRect(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50" />

      {targetRect ? (
        <div
          className="absolute z-[9999] rounded-2xl ring-4 ring-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      ) : null}

      <div
        className="absolute z-[10000] w-[320px] rounded-2xl border bg-white p-5 shadow-2xl"
        style={{
          top: targetRect ? targetRect.top + targetRect.height + 20 : 100,
          left: targetRect ? Math.max(16, targetRect.left) : 16,
        }}
      >
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </div>

        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          {currentStep.title}
        </h3>

        <p className="mt-2 text-sm text-gray-600">{currentStep.description}</p>

        {!targetRect ? (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
            This step target was not found on the page. Check the matching
            <code className="mx-1">data-tour</code>
            attribute.
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            className="rounded-xl border px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
          >
            Skip
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={back}
              disabled={isFirst}
              className="rounded-xl border px-3 py-2 text-sm font-medium text-gray-900 disabled:opacity-50 hover:bg-gray-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

