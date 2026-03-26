export type AgeUnit = "days" | "months";
export type StartPage =
  | "/dashboard"
  | "/pigs"
  | "/tasks"
  | "/reports"
  | "/pregnant-pigs";

const AGE_UNIT_KEY = "ageUnit";
const START_PAGE_KEY = "startPage";

export function getAgeUnit(): AgeUnit {
  if (typeof window === "undefined") return "days";
  const saved = localStorage.getItem(AGE_UNIT_KEY);
  return saved === "months" ? "months" : "days";
}

export function setAgeUnit(unit: AgeUnit) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGE_UNIT_KEY, unit);
}

export function getStartPage(): StartPage {
  if (typeof window === "undefined") return "/dashboard";
  const saved = localStorage.getItem(START_PAGE_KEY) as StartPage | null;

  if (
    saved === "/dashboard" ||
    saved === "/pigs" ||
    saved === "/tasks" ||
    saved === "/reports" ||
    saved === "/pregnant-pigs"
  ) {
    return saved;
  }

  return "/dashboard";
}

export function setStartPage(path: StartPage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(START_PAGE_KEY, path);
}

export function formatAge(
  birthDate: string | null,
  unit: AgeUnit,
): string {
  if (!birthDate) return "-";

  const birth = new Date(birthDate);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (unit === "days") {
    return `${ageDays} days`;
  }

  const ageMonths = Math.floor(ageDays / 30);
  return `${ageMonths} month${ageMonths === 1 ? "" : "s"}`;
}