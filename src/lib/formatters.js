import { getTravelDayNumber } from "./tripPlanning.js";

export function formatRouteDistance(meters) {
  const miles = meters / 1609.344;
  return `${Math.round(miles).toLocaleString()} miles`;
}

export function formatRouteDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} hr ${minutes} min`;
}

export function formatGameDate(startDate, startTimeTBD) {
  if (!startDate) return "Date TBD";

  const date = new Date(startDate);
  const dateText = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (startTimeTBD) {
    return `${dateText} · Kickoff TBD`;
  }

  const timeText = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateText} · ${timeText}`;
}

export function formatTripStats(route) {
  if (!route) return null;

  return {
    distance: formatRouteDistance(route.distanceMeters),
    driveTime: formatRouteDuration(route.durationSeconds),
    durationSeconds: Number(route.durationSeconds) || 0,
    provider: route.provider,
  };
}

export function formatRouteProgress(
  progress,
  dayCount,
  type = "day",
  durationSeconds = 0
) {
  const normalizedProgress = Number(progress) || 0;
  const percent = Math.round(normalizedProgress * 100);
  const days = Math.max(1, Number(dayCount) || 1);

  if (days <= 1) {
    return `Same-day drive · ${percent}%`;
  }

  if (type === "hotel") {
    const night = Math.min(
      days - 1,
      Math.max(1, Math.round(normalizedProgress * days))
    );

    const elapsedHours =
      Number(durationSeconds) > 0
        ? (Number(durationSeconds) * normalizedProgress) / 3600
        : 0;

    const driveLabel =
      elapsedHours > 0
        ? ` · about ${Math.round(elapsedHours)} hrs driving`
        : "";

    return `Night ${night} of ${days - 1}${driveLabel} · ${percent}% into trip`;
  }

  const day = getTravelDayNumber(normalizedProgress, days);
  return `Day ${day} of ${days} · ${percent}% into trip`;
}
