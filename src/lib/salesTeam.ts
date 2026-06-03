export const SALES_TEAM = [
  "Nikhil",
  "Aparna",
  "Praveen",
  "Faizan",
  "Arbaz",
  "Adnan",
  "Aditya",
  "Aakash",
  "Israr",
  "Zaid",
] as const;

export type SalesTeamMember = (typeof SALES_TEAM)[number];

export const SALES_TEAM_OPTIONS = SALES_TEAM.map((name) => ({
  label: name,
  value: name,
}));

export const formatSalesmanName = (value?: string | null) => {
  const trimmed = (value || "").trim();
  return trimmed || "-";
};
