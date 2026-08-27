import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

function createDestinationIcon(label, isStadium = false) {
  return L.divIcon({
    className: isStadium
      ? "destination-marker stadium-marker"
      : "destination-marker",
    html: isStadium
      ? `<div><span>🏟</span><strong>STADIUM</strong></div>`
      : `<div>${label}</div>`,
    iconSize: isStadium ? [92, 46] : [30, 30],
    iconAnchor: isStadium ? [46, 23] : [15, 15],
    popupAnchor: [0, -18],
  });
}

function FitDestinationBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;

    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), {
      padding: [45, 45],
    });
  }, [map, positions]);

  return null;
}

function validCoordinate(item) {
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  );
}

export default function DestinationMap({
  venue,
  restaurants = [],
  bars = [],
  hotels = [],
}) {
  const places = useMemo(
    () => [
      ...restaurants.slice(0, 3).map((place) => ({
        ...place,
        category: "restaurant",
        marker: "🍴",
      })),
      ...bars.slice(0, 3).map((place) => ({
        ...place,
        category: "bar",
        marker: "🍺",
      })),
      ...hotels.slice(0, 3).map((place) => ({
        ...place,
        category: "hotel",
        marker: "🛏",
      })),
    ].filter(validCoordinate),
    [restaurants, bars, hotels]
  );

  const validVenue = validCoordinate(venue);

  const positions = useMemo(() => {
    const values = [];

    if (validVenue) {
      values.push([Number(venue.latitude), Number(venue.longitude)]);
    }

    places.forEach((place) => {
      values.push([Number(place.latitude), Number(place.longitude)]);
    });

    return values;
  }, [venue, validVenue, places]);

  if (!validVenue && places.length === 0) {
    return (
      <p className="empty-state">
        Destination map locations are unavailable.
      </p>
    );
  }

  const center = validVenue
    ? [Number(venue.latitude), Number(venue.longitude)]
    : positions[0];

  return (
    <div className="destination-map-wrap">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="destination-map"
      >
        <FitDestinationBounds positions={positions} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validVenue ? (
          <Marker
            position={[Number(venue.latitude), Number(venue.longitude)]}
            icon={createDestinationIcon("🏟", true)}
          >
            <Popup>
              <strong>{venue.name}</strong>
              <br />
              {venue.city}
              {venue.state ? `, ${venue.state}` : ""}
            </Popup>
          </Marker>
        ) : null}

        {places.map((place) => (
          <Marker
            key={`${place.category}-${place.id}`}
            position={[Number(place.latitude), Number(place.longitude)]}
            icon={createDestinationIcon(place.marker)}
          >
            <Popup>
              <strong>{place.name}</strong>

              {place.rating ? (
                <>
                  <br />
                  {place.rating} ★
                  {place.ratingCount
                    ? ` · ${place.ratingCount.toLocaleString()} reviews`
                    : ""}
                </>
              ) : null}

              {place.address ? (
                <>
                  <br />
                  {place.address}
                </>
              ) : null}

              {place.website ? (
                <>
                  <br />
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit website
                  </a>
                </>
              ) : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
