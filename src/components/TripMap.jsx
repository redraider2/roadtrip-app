import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function createNumberedIcon(label) {
  return L.divIcon({
    className: "numbered-marker",
    html: `<div>${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function Recenter({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);

  return null;
}

function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;

    const bounds = L.latLngBounds(positions);

    map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }, [map, positions]);

  return null;
}

async function geocode(place, signal) {
  const q = place?.trim();
  if (!q) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, {
      signal,
      headers: { "Accept-Language": "en" },
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

function isValidCoordinate(stop) {
  const lat = Number(stop.latitude);
  const lon = Number(stop.longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat !== 0 &&
    lon !== 0
  );
}

export default function TripMap({ start, end, stops = [] }) {
  const [startLoc, setStartLoc] = useState(null);
  const [endLoc, setEndLoc] = useState(null);
  const [status, setStatus] = useState("");

  const defaultCenter = useMemo(() => [39.5, -98.35], []);

  const validStops = useMemo(
    () =>
      stops
        .filter(isValidCoordinate)
        .sort((a, b) => a.order_index - b.order_index),
    [stops]
  );

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

      if (!s && !e) {
        setStatus("Couldn’t find locations. Try adding city + state.");
      } else {
        setStatus("");
      }
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

  const routePositions = useMemo(() => {
    const positions = [];

    if (startLoc) {
      positions.push([startLoc.lat, startLoc.lon]);
    }

    validStops.forEach((stop) => {
      positions.push([Number(stop.latitude), Number(stop.longitude)]);
    });

    if (endLoc) {
      positions.push([endLoc.lat, endLoc.lon]);
    }

    return positions;
  }, [startLoc, endLoc, validStops]);

  const center = useMemo(() => {
    if (routePositions.length > 0) {
      const latTotal = routePositions.reduce((sum, point) => sum + point[0], 0);
      const lonTotal = routePositions.reduce((sum, point) => sum + point[1], 0);

      return [latTotal / routePositions.length, lonTotal / routePositions.length];
    }

    return defaultCenter;
  }, [routePositions, defaultCenter]);

  const zoom =
    routePositions.length >= 2 ? 5 : routePositions.length === 1 ? 6 : 4;

  return (
    <>
      {status ? <p className="empty-state">{status}</p> : null}

      <div className="map-wrap">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false}>
          <Recenter center={center} zoom={zoom} />
          <FitBounds positions={routePositions} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {startLoc ? (
            <Marker
              position={[startLoc.lat, startLoc.lon]}
              icon={createNumberedIcon("S")}
            >
              <Popup>
                <strong>Start</strong>
                <br />
                {startLoc.label}
              </Popup>
            </Marker>
          ) : null}

          {validStops.map((stop) => (
            <Marker
              key={stop.id}
              position={[Number(stop.latitude), Number(stop.longitude)]}
              icon={createNumberedIcon(stop.order_index + 1)}
            >
              <Popup>
                <strong>Stop {stop.order_index + 1}</strong>
                <br />
                {stop.name}
                {stop.notes ? (
                  <>
                    <br />
                    {stop.notes}
                  </>
                ) : null}
              </Popup>
            </Marker>
          ))}

          {endLoc ? (
            <Marker
              position={[endLoc.lat, endLoc.lon]}
              icon={createNumberedIcon("E")}
            >
              <Popup>
                <strong>End</strong>
                <br />
                {endLoc.label}
              </Popup>
            </Marker>
          ) : null}

          {routePositions.length >= 2 ? (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#1e90ff",
                weight: 5,
                opacity: 0.8,
              }}
            />
          ) : null}
        </MapContainer>
      </div>
    </>
  );
}