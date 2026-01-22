import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Vite/React setups
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

async function geocode(place, signal) {
  const q = place?.trim();
  if (!q) return null;

  try {
    // Nominatim (OpenStreetMap) geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, {
      signal,
      headers: {
        // Helps Nominatim; some browsers ignore this, but it's fine.
        "Accept-Language": "en",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      label: data[0].display_name,
    };
  } catch (err) {
    if (err?.name === "AbortError") return null;
    return null;
  }
}

export default function TripMap({ start, end }) {
  const [startLoc, setStartLoc] = useState(null);
  const [endLoc, setEndLoc] = useState(null);
  const [status, setStatus] = useState("");

  // Default center (USA)
  const defaultCenter = useMemo(() => [39.5, -98.35], []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setStatus("");
      setStartLoc(null);
      setEndLoc(null);

      if (!start?.trim() && !end?.trim()) return;

      setStatus("Finding locations…");

      const [s, e] = await Promise.all([
        geocode(start, controller.signal),
        geocode(end, controller.signal),
      ]);

      if (cancelled) return;

      setStartLoc(s);
      setEndLoc(e);

      if (!s && !e) setStatus("Couldn’t find locations. Try adding city + state.");
      else setStatus("");
    }

    const debounceId = setTimeout(() => {
      run().catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        setStatus("Map lookup failed. Check your connection.");
      });
    }, 400);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(debounceId);
    };
  }, [start, end]);

  const center = useMemo(() => {
    if (startLoc && endLoc) {
      return [(startLoc.lat + endLoc.lat) / 2, (startLoc.lon + endLoc.lon) / 2];
    }
    if (startLoc) return [startLoc.lat, startLoc.lon];
    if (endLoc) return [endLoc.lat, endLoc.lon];
    return defaultCenter;
  }, [startLoc, endLoc, defaultCenter]);

  return (
    <div className="panel" style={{ marginTop: "1rem" }}>
      

      {status ? <p className="empty-state">{status}</p> : null}

      <div className="map-wrap">
        <MapContainer center={center} zoom={startLoc || endLoc ? 6 : 4} scrollWheelZoom={false}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {startLoc ? (
            <Marker position={[startLoc.lat, startLoc.lon]}>
              <Popup>
                <strong>Start</strong>
                <br />
                {startLoc.label}
              </Popup>
            </Marker>
          ) : null}

          {endLoc ? (
            <Marker position={[endLoc.lat, endLoc.lon]}>
              <Popup>
                <strong>End</strong>
                <br />
                {endLoc.label}
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
