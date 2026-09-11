const EARTH_METERS = 6371000;
export const MILE_METERS = 1609.344;
const radians = (degrees) => degrees * Math.PI / 180;

export function validPoint(point) {
  return Array.isArray(point) && point.length >= 2 &&
    Number.isFinite(point[0]) && Math.abs(point[0]) <= 90 &&
    Number.isFinite(point[1]) && Math.abs(point[1]) <= 180;
}

export function distanceMeters(a, b) {
  const lat = radians(b[0] - a[0]);
  const lng = radians(b[1] - a[1]);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(radians(a[0])) *
    Math.cos(radians(b[0])) * Math.sin(lng / 2) ** 2;
  return 2 * EARTH_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function prepareRoute(geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2 || !geometry.every(validPoint)) return null;
  const cumulative = [0];
  for (let i = 1; i < geometry.length; i++) {
    cumulative.push(cumulative[i - 1] + distanceMeters(geometry[i - 1], geometry[i]));
  }
  const totalMeters = cumulative.at(-1);
  return totalMeters > 0 ? { geometry, cumulative, totalMeters } : null;
}

// Project onto each segment instead of snapping to the nearest route vertex.
export function locateOnRoute(point, route) {
  if (!route || !validPoint(point)) return null;
  let best = null;
  for (let i = 1; i < route.geometry.length; i++) {
    const a = route.geometry[i - 1];
    const b = route.geometry[i];
    const scale = Math.cos(radians(point[0]));
    const x = (b[1] - a[1]) * scale;
    const y = b[0] - a[0];
    const px = (point[1] - a[1]) * scale;
    const py = point[0] - a[0];
    const denominator = x * x + y * y;
    const fraction = denominator ? Math.max(0, Math.min(1, (px * x + py * y) / denominator)) : 0;
    const projected = [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])];
    const offRouteMeters = distanceMeters(point, projected);
    if (!best || offRouteMeters < best.offRouteMeters) {
      const traveledMeters = route.cumulative[i - 1] + fraction * (route.cumulative[i] - route.cumulative[i - 1]);
      best = { segment: i - 1, projected, offRouteMeters, traveledMeters,
        remainingMeters: route.totalMeters - traveledMeters, progress: traveledMeters / route.totalMeters };
    }
  }
  return best;
}

export function buildLiveJourney(fix, route, durationSeconds, now = Date.now()) {
  if (!fix || !Number.isFinite(fix.timestamp) || now - fix.timestamp > 60000 || fix.timestamp > now + 10000 ||
      !Number.isFinite(fix.accuracy) || fix.accuracy > 500 || fix.accuracy < 0) return null;
  const location = locateOnRoute([fix.latitude, fix.longitude], route);
  if (!location) return null;
  const offRoute = location.offRouteMeters > 1000;
  const atDestination = distanceMeters([fix.latitude, fix.longitude], route.geometry.at(-1)) < 500;
  const phase = offRoute ? "off_route" : atDestination && location.progress > 0.95 ? "arrived" :
    location.remainingMeters < 25 * MILE_METERS ? "approaching_destination" :
    location.progress < 0.02 ? "departing" : "en_route";
  const remainingSeconds = !offRoute && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds * (1 - location.progress) : null;
  return { ...location, phase, remainingSeconds,
    eta: remainingSeconds === null ? null : fix.timestamp + remainingSeconds * 1000 };
}

export function upcomingGeometry(route, journey, miles = 60) {
  if (!route || !journey || journey.phase === "off_route" || journey.phase === "arrived") return [];
  const points = [journey.projected];
  for (let i = journey.segment + 1; i < route.geometry.length; i++) {
    points.push(route.geometry[i]);
    if (route.cumulative[i] - journey.traveledMeters >= miles * MILE_METERS) break;
  }
  if (points.length <= 100) return points;
  const step = Math.ceil(points.length / 99);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

export function recommendAhead(places, route, journey, localHour) {
  if (!journey || ["off_route", "arrived"].includes(journey.phase)) return [];
  const meal = (localHour >= 6 && localHour < 10) || (localHour >= 11 && localHour < 14) ||
    (localHour >= 17 && localHour < 21);
  const seen = new Set();
  return places.flatMap((place) => {
    if (place.latitude == null || place.longitude == null) return [];
    const position = locateOnRoute([Number(place.latitude), Number(place.longitude)], route);
    if (!position) return [];
    const aheadMiles = (position.traveledMeters - journey.traveledMeters) / MILE_METERS;
    const routeOffsetMiles = position.offRouteMeters / MILE_METERS;
    const key = place.id || `${place.name}:${place.latitude}:${place.longitude}`;
    if (seen.has(key) || aheadMiles < 0.2 || aheadMiles > 60 || routeOffsetMiles > 5) return [];
    seen.add(key);
    const priority = place.category === "restaurant" && meal ? 30 :
      place.category === "hotel" && localHour >= 17 ? 25 : place.category === "historic" ? 10 : 0;
    const reason = place.category === "restaurant" && meal ? "A food stop ahead during mealtime" :
      place.category === "hotel" ? "An overnight option ahead" :
        place.category === "historic" ? "An interesting stop ahead" : "Food ahead on your route";
    return [{ ...place, aheadMiles, routeOffsetMiles, reason, score: priority - aheadMiles / 5 - routeOffsetMiles }];
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}

// Keeping the subscription independent of React makes permission and cleanup behavior testable.
export function watchJourneyLocation(geolocation, onFix, onError) {
  let active = true;
  if (!geolocation) {
    onError("Location isn’t available in this browser.");
    return () => {};
  }
  const fail = (error) => {
    if (active) onError(error.code === 1 ? "Location access was declined. Allow location in your browser, then try again." :
      error.code === 3 ? "Location timed out. Try again where your device has a clear signal." :
        "Your location is unavailable. Check your device’s location settings and try again.");
  };
  let id;
  try {
    id = geolocation.watchPosition((position) => {
      if (!active) return;
      onFix({ latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp });
    }, fail, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  } catch (error) { fail(error); }
  return () => { active = false; if (id !== undefined) geolocation.clearWatch(id); };
}
