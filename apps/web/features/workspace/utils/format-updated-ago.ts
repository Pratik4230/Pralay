const divisions = [
  { amount: 60, unit: "second" as const },
  { amount: 60, unit: "minute" as const },
  { amount: 24, unit: "hour" as const },
  { amount: 7, unit: "day" as const },
  { amount: 4.34524, unit: "week" as const },
  { amount: 12, unit: "month" as const },
  { amount: Number.POSITIVE_INFINITY, unit: "year" as const },
];

export function formatUpdatedAgo(isoDate: string) {
  const date = new Date(isoDate);
  let duration = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }

    duration /= division.amount;
  }

  return rtf.format(Math.round(duration), "year");
}
