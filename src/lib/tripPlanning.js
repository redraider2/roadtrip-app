export function isValidCoordinate(stop) {
  const latitude = Number(stop.latitude);
  const longitude = Number(stop.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  );
}

export function normalizePlaceName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTravelDayNumber(progress, dayCount) {
  const days = Math.max(1, Number(dayCount) || 1);
  const normalizedProgress = Math.min(
    0.999999,
    Math.max(0, Number(progress) || 0)
  );

  return Math.min(days, Math.floor(normalizedProgress * days) + 1);
}

export function comparePlaceQuality(a, b) {
  const ratingDifference =
    (Number(b.rating) || 0) - (Number(a.rating) || 0);

  if (ratingDifference !== 0) {
    return ratingDifference;
  }

  return (Number(b.ratingCount) || 0) - (Number(a.ratingCount) || 0);
}

export function orderPlacesByTravelDay(places, dayCount) {
  if (!Array.isArray(places) || places.length === 0) {
    return [];
  }

  const days = Math.max(1, Number(dayCount) || 1);
  const ordered = [];
  const usedIds = new Set();

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const start = dayIndex / days;
    const end = (dayIndex + 1) / days;
    const target = (start + end) / 2;

    const candidates = places
      .filter((place) => {
        const progress = Number(place.routeProgress);

        if (!Number.isFinite(progress)) {
          return false;
        }

        const inStretch =
          dayIndex === days - 1
            ? progress >= start && progress <= end
            : progress >= start && progress < end;

        return inStretch && !usedIds.has(place.id);
      })
      .sort((a, b) => {
        const aDistance = Math.abs(Number(a.routeProgress) - target);
        const bDistance = Math.abs(Number(b.routeProgress) - target);

        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }

        return comparePlaceQuality(a, b);
      });

    if (candidates.length > 0) {
      const selected = candidates[0];
      ordered.push(selected);
      usedIds.add(selected.id);
    }
  }

  const remaining = places
    .filter((place) => !usedIds.has(place.id))
    .sort((a, b) => {
      const progressDifference =
        (Number(a.routeProgress) || 0) -
        (Number(b.routeProgress) || 0);

      if (progressDifference !== 0) {
        return progressDifference;
      }

      return comparePlaceQuality(a, b);
    });

  return [...ordered, ...remaining];
}

export function orderHotelsByTravelNight(places, dayCount) {
  if (!Array.isArray(places) || places.length === 0) {
    return [];
  }

  const days = Math.max(1, Number(dayCount) || 1);

  if (days <= 1) {
    return [...places].sort(comparePlaceQuality);
  }

  const ordered = [];
  const usedIds = new Set();

  for (let nightIndex = 1; nightIndex < days; nightIndex += 1) {
    const target = nightIndex / days;

    const candidates = places
      .filter((place) => !usedIds.has(place.id))
      .sort((a, b) => {
        const aDistance =
          Math.abs((Number(a.routeProgress) || 0) - target);
        const bDistance =
          Math.abs((Number(b.routeProgress) || 0) - target);

        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }

        return comparePlaceQuality(a, b);
      });

    if (candidates.length > 0) {
      const selected = candidates[0];
      ordered.push(selected);
      usedIds.add(selected.id);
    }
  }

  const remaining = places
    .filter((place) => !usedIds.has(place.id))
    .sort((a, b) => {
      const progressDifference =
        (Number(a.routeProgress) || 0) -
        (Number(b.routeProgress) || 0);

      if (progressDifference !== 0) {
        return progressDifference;
      }

      return comparePlaceQuality(a, b);
    });

  return [...ordered, ...remaining];
}

export function getOvernightTargets(durationSeconds, dailyDriveHours) {
  const hours = Number(dailyDriveHours);

  if (
    dailyDriveHours === "straight" ||
    !Number.isFinite(hours) ||
    hours <= 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return [];
  }

  const totalHours = durationSeconds / 3600;
  const dailyTolerance = 1.15;
  const effectiveDailyHours = hours * dailyTolerance;
  const dayCount = Math.max(1, Math.ceil(totalHours / effectiveDailyHours));

  if (dayCount <= 1) {
    return [];
  }

  return Array.from(
    { length: dayCount - 1 },
    (_, index) => (index + 1) / dayCount
  );
}
