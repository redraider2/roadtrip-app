// Read-only CFBD reconciliation. Reports differences for review without changing
// the guide catalog or publishing event assignments from an older season.
import { readFile } from "node:fs/promises";
const content = JSON.parse(await readFile(new URL("../src/data/bowlDestinations.json", import.meta.url), "utf8"));
const key = process.env.CFBD_API_KEY;
if (!key) throw new Error("Set CFBD_API_KEY to review current provider venue mappings.");
const response = await fetch("https://api.collegefootballdata.com/venues", { headers: { Authorization: `Bearer ${key}` } });
if (!response.ok) throw new Error(`CFBD venue request failed: ${response.status}`);
const venues = await response.json();
const normalize = value => String(value || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const report = content.destinations.map(destination => {
  const existing = venues.find(venue => destination.destinationVenueIds.includes(String(venue.id)));
  const candidates = existing ? [] : venues.filter(venue => normalize(venue.name) === normalize(destination.venueName) && normalize(venue.city) === normalize(destination.city));
  return {
    destinationId: destination.destinationId,
    status: existing ? "mapped" : candidates.length === 1 ? "new_candidate_requires_review" : "unmapped",
    currentVenue: existing ? { id: existing.id, name: existing.name, city: existing.city, state: existing.state } : null,
    reviewedVenue: { name: destination.venueName, city: destination.city, state: destination.state },
    candidates: candidates.map(venue => ({ id: venue.id, name: venue.name, city: venue.city, state: venue.state })),
  };
});
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), season: content.season, report }, null, 2));
