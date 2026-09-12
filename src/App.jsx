import { useCallback, useEffect, useMemo, useState } from "react";
import Background from "./components/Background";
import "./App.css";
import TripMap from "./components/TripMap";
import DestinationMap from "./components/DestinationMap";
import JourneyNavigation from "./components/JourneyNavigation.jsx";
import HomeExperience from "./components/HomeExperience.jsx";
import ChooseTeamExperience from "./components/ChooseTeamExperience.jsx";
import ChooseGameExperience from "./components/ChooseGameExperience.jsx";
import DriveExperience from "./components/DriveExperience.jsx";
import TripHqExperience from "./components/TripHqExperience.jsx";
import PartnerPlacement from "./components/PartnerPlacement.jsx";
import PlanWorkspace from "./components/PlanWorkspace.jsx";
import {
  formatGameDate,
  formatRouteProgress,
  formatTripStats,
} from "./lib/formatters.js";
import {
  getOvernightTargets,
  getTravelDayNumber,
  isValidCoordinate,
  normalizePlaceName,
  orderHotelsByTravelNight,
  orderPlacesByTravelDay,
} from "./lib/tripPlanning.js";
import {
  ChooseGameScreen,
  ChooseTeamScreen,
  DriveScreen,
  GameDayScreen,
  GameWeekendScreen,
  HomeScreen,
  PlanAlongTheWayScreen,
  PlanRouteScheduleScreen,
  PlanStayItineraryScreen,
  TripHqScreen,
} from "./screens/JourneyScreens.jsx";
import { useJourneyNavigation } from "./screens/useJourneyNavigation.js";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

const FOOTBALL_SEASON = 2026;

const AUTH_STORAGE_KEY = "roadtrip_auth";

const PLAN_SCREEN_IDS = [
  "plan-route-schedule",
  "plan-along-the-way",
  "plan-stay-itinerary",
];

const DEVELOPMENT_PARTNER_PREVIEW = {
  businessName: "Sample Road Trip Partner",
  locationText: "Development-only placement preview",
  description:
    "A clearly labeled sample showing how a destination partner fits beside the trip without competing with maps, recommendations, or itinerary details.",
  offerText: "Sample traveler offer for visual review",
  websiteUrl: "https://example.com",
  directionsUrl: "https://www.google.com/maps",
};

const KICKOFF_MILES_HOUSE_AD = {
  id: "kickoff-miles-house-ad",
  businessName: "This Could Be Your Space",
  locationText: "Put your business in front of travelers when they’re nearby.",
  description:
    "Reach college football fans while they plan, drive, and explore game-day destinations.",
  websiteUrl:
    "mailto:support@kickoffmiles.com?subject=Advertise%20on%20Kickoff%20Miles",
  websiteLabel: "Advertise on Kickoff Miles",
  isHouseAd: true,
};

function isRetiredPartner(partner) {
  return /spanky(?:['’]?s)?/i.test(String(partner?.businessName || ""));
}

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function authFetch(url, options = {}, token) {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}


async function geocodePlace(place, signal) {
  const query = place.trim();

  const res = await fetch(
    `${API_BASE_URL}/geocode?q=${encodeURIComponent(query)}`,
    { signal }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));

    throw new Error(
      errorData.error || `No location found for ${place}`
    );
  }

  const data = await res.json();

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid coordinates returned");
  }

  return { latitude, longitude };
}

async function fetchRoadRoute(points, signal) {
  const res = await fetch(`${API_BASE_URL}/route`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || "Failed to calculate road route");
}

  return res.json();
}

const TAILGATING_GUIDES = {
  Vanderbilt: {
    venue: "FirstBank Stadium",
    where: [
      "Vandyville is Vanderbilt’s primary pregame tailgating area.",
      "Tailgating activity is centered around Natchez Trace, Jess Neely Drive, and Vanderbilt Place.",
      "Vandyville typically includes reserved tailgate spaces, food trucks, family activities, and live entertainment.",
    ],
    arrival: [
      "Vandyville opens about 4 hours before kickoff.",
      "For 11:00 AM kickoffs, reserved parking lots generally open around 7:00 AM.",
      "For later kickoffs, reserved lots generally open around 8:00 AM.",
    ],
    rules: [
      "Tailgating is not permitted inside parking garages.",
      "Tailgates must remain within designated parking or tailgating spaces.",
      "Tents are limited to approximately 10 × 10 feet.",
      "Tent stakes are prohibited.",
      "Drive lanes must remain open.",
      "Each occupied parking space requires the appropriate parking pass.",
    ],
    visitors: [
      "Vandyville is the best starting point for visiting fans who want a public pregame atmosphere.",
      "Visitors should arrive early because parking and tailgate areas near FirstBank Stadium fill quickly.",
      "Full-service tailgate packages may also be available near the stadium.",
    ],
    sourceUrl: "https://vucommodores.com/football-gameday/",
  },
};

function App() {
  const { activeScreen, navigateTo } = useJourneyNavigation();
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [tripsError, setTripsError] = useState("");

  const [tripName, setTripName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const [footballTeams, setFootballTeams] = useState([]);
  const [footballTeamsLoading, setFootballTeamsLoading] = useState(true);
  const [selectedFootballTeam, setSelectedFootballTeam] = useState("");
  const [footballGames, setFootballGames] = useState([]);
  const [selectedFootballGameId, setSelectedFootballGameId] = useState("");
  const [dailyDriveHours, setDailyDriveHours] = useState("8");
  const [footballStart, setFootballStart] = useState("");
  const [footballLoading, setFootballLoading] = useState(false);
  const [footballError, setFootballError] = useState("");
  const [weekendPlaces, setWeekendPlaces] = useState({
    restaurant: [],
    bar: [],
    hotel: [],
  });
  const [weekendVenue, setWeekendVenue] = useState(null);
  const [featuredPartner, setFeaturedPartner] = useState(null);
  const [weekendPlacesLoading, setWeekendPlacesLoading] = useState(false);
  const [weekendPlacesError, setWeekendPlacesError] = useState("");
  const [gameDayGuide, setGameDayGuide] = useState(null);
  const [gameDayGuideLoading, setGameDayGuideLoading] = useState(false);
  const [gameDayGuideError, setGameDayGuideError] = useState("");
  const [showAllAlong, setShowAllAlong] = useState(false);
  const [showAllWeekend, setShowAllWeekend] = useState(false);
  const [openGameDaySection, setOpenGameDaySection] = useState(null);
  

  const [alongTheWay, setAlongTheWay] = useState({
    restaurant: [],
    hotel: [],
    historic: [],
  });
  const [alongTheWayLoading, setAlongTheWayLoading] = useState(false);
  const [alongTheWayError, setAlongTheWayError] = useState("");

  const [stops, setStops] = useState([]);
  const [stopsError, setStopsError] = useState("");
  const [stopName, setStopName] = useState("");
  const [stopType, setStopType] = useState("waypoint");
  const [stopRating, setStopRating] = useState("");
  const [stopNotes, setStopNotes] = useState("");
  const [stopTrivia, setStopTrivia] = useState("");

  const [tripStats, setTripStats] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]);

  const overnightTargets = useMemo(
    () =>
      getOvernightTargets(
        Number(tripStats?.durationSeconds) || 0,
        dailyDriveHours
      ),
    [tripStats?.durationSeconds, dailyDriveHours]
  );

  const travelDayCount =
    dailyDriveHours === "straight"
      ? 1
      : overnightTargets.length + 1;

  const travelPlanDescription =
    dailyDriveHours === "straight"
      ? "Straight through"
      : overnightTargets.length === 0
        ? "1 day · no overnight stop needed"
        : `${travelDayCount} days · ${overnightTargets.length} ${
            overnightTargets.length === 1 ? "overnight" : "overnights"
          }`;

  const orderedRestaurants = useMemo(
    () =>
      orderPlacesByTravelDay(
        alongTheWay.restaurant,
        travelDayCount
      ),
    [alongTheWay.restaurant, travelDayCount]
  );

  const prioritizedHotels = useMemo(
    () =>
      orderHotelsByTravelNight(
        alongTheWay.hotel,
        travelDayCount
      ),
    [alongTheWay.hotel, travelDayCount]
  );

  const orderedHistoric = useMemo(
    () =>
      orderPlacesByTravelDay(
        alongTheWay.historic,
        travelDayCount
      ),
    [alongTheWay.historic, travelDayCount]
  );

  const dayByDayPlan = useMemo(() => {
  return Array.from({ length: travelDayCount }, (_, index) => {
    const dayNumber = index + 1;

    const restaurant =
      orderedRestaurants.find(
        (place) =>
          getTravelDayNumber(place.routeProgress, travelDayCount) === dayNumber
      ) || null;

    const historic =
      orderedHistoric.find(
        (place) =>
          getTravelDayNumber(place.routeProgress, travelDayCount) === dayNumber
      ) || null;

    const hotel =
      dayNumber < travelDayCount
        ? prioritizedHotels[dayNumber - 1] || null
        : null;

    return {
      dayNumber,
      restaurant,
      historic,
      hotel,
    };
  });
}, [
  travelDayCount,
  orderedRestaurants,
  orderedHistoric,
  prioritizedHotels,
]);

  const fetchTrips = useCallback(async () => {
    if (!auth?.token) {
      setTrips([]);
      setActiveTripId(null);
      setStops([]);
      setTripsError("");
      return;
    }

    try {
      setTripsError("");

      const res = await authFetch(
        `${API_BASE_URL}/trips`,
        {},
        auth.token
      );

      if (!res.ok) throw new Error("Failed to fetch trips");

      const data = await res.json();

      const normalizedTrips = data.map((trip) => ({
        id: Number(trip.id),
        name: trip.title,
        start: trip.start_location || "",
        end: trip.end_location || "",
        venueId: trip.venue_id || null,
        notes: trip.notes || "",
        isFavorite: Boolean(trip.is_favorite),
        createdAt: trip.createdAt,
        highlights: [],
      }));

      setTrips(normalizedTrips);

      setActiveTripId((currentId) => {
        if (currentId && normalizedTrips.some((t) => t.id === currentId)) {
          return currentId;
        }

        return normalizedTrips[0]?.id ?? null;
      });
    } catch (err) {
      console.error("Failed to load trips:", err);
      setTripsError("Trips could not be loaded.");
    }
  }, [auth?.token]);

  const fetchStops = useCallback(async (tripId) => {
    if (!tripId || !auth?.token) {
      setStops([]);
      return;
    }

    try {
      setStopsError("");

      const res = await authFetch(
        `${API_BASE_URL}/trips/${tripId}/stops`,
        {},
        auth.token
      );

      if (!res.ok) throw new Error("Failed to fetch stops");

      const data = await res.json();
      setStops(data);
    } catch (err) {
      console.error("Fetch stops failed:", err);
      setStopsError("Stops could not be loaded for this trip.");
    }
  }, [auth?.token]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    let cancelled = false;

    async function loadFootballTeams() {
      try {
        setFootballError("");
        const res = await fetch(`${API_BASE_URL}/football/teams`);

        if (!res.ok) {
          throw new Error("Failed to fetch FBS teams");
        }

        const data = await res.json();

        if (!cancelled) {
          setFootballTeams(data);
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Football teams failed:", err);
        setFootballError(
          "College football teams could not be loaded. Check the backend API."
        );
      } finally {
        if (!cancelled) {
          setFootballTeamsLoading(false);
        }
      }
    }

    loadFootballTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadFootballGames() {
      if (!selectedFootballTeam) {
        setFootballGames([]);
        setSelectedFootballGameId("");
        return;
      }

      try {
        setFootballLoading(true);
        setFootballError("");
        setFootballGames([]);
        setSelectedFootballGameId("");

        const res = await fetch(
          `${API_BASE_URL}/football/games?team=${encodeURIComponent(
            selectedFootballTeam
          )}&year=${FOOTBALL_SEASON}&awayOnly=true`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch road games");
        }

        const data = await res.json();

        if (!cancelled) {
          setFootballGames(data);
        }
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Football games failed:", err);
        setFootballError(
          "Away games could not be loaded for that team. Try another team or check the backend API."
        );
      } finally {
        if (!cancelled) {
          setFootballLoading(false);
        }
      }
    }

    loadFootballGames();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedFootballTeam]);

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || null,
    [trips, activeTripId]
  );

  const selectedFootballGame = useMemo(
    () =>
      footballGames.find(
        (game) => String(game.id) === String(selectedFootballGameId)
      ) || null,
    [footballGames, selectedFootballGameId]
  );
  

  const backgroundTeam = useMemo(() => {
    const destinationTeam = selectedFootballGame?.homeTeam;

    if (destinationTeam) {
      return (
        footballTeams.find((team) => team.school === destinationTeam) || null
      );
    }

    if (selectedFootballTeam) {
      return (
        footballTeams.find((team) => team.school === selectedFootballTeam) ||
        null
      );
    }

    return null;
  }, [footballTeams, selectedFootballGame, selectedFootballTeam]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadWeekendPlaces() {
  const venueId =
    selectedFootballGame?.venueId || activeTrip?.venueId;

  if (!venueId) {
    setWeekendPlaces({ restaurant: [], bar: [], hotel: [] });
    setWeekendVenue(null);
    setFeaturedPartner(null);
    setWeekendPlacesError("");
    return;
  }

  try {
    setWeekendPlacesLoading(true);
    setWeekendPlacesError("");

    const [restaurantRes, barRes, hotelRes, featuredPartnerRes] =
      await Promise.all([
        fetch(
          `${API_BASE_URL}/football/venues/${venueId}/places?category=restaurant`,
          { signal: controller.signal }
        ),
        fetch(
          `${API_BASE_URL}/football/venues/${venueId}/places?category=bar`,
          { signal: controller.signal }
        ),
        fetch(
          `${API_BASE_URL}/football/venues/${venueId}/places?category=hotel`,
          { signal: controller.signal }
        ),
        fetch(
          `${API_BASE_URL}/football/venues/${venueId}/featured-partner${
            selectedFootballGame?.id
              ? `?gameId=${encodeURIComponent(selectedFootballGame.id)}`
              : ""
          }`,
          { signal: controller.signal }
        ),
      ]);

        if (!restaurantRes.ok || !barRes.ok || !hotelRes.ok) {
          throw new Error("Failed to load game weekend places");
        }

        const [restaurantData, barData, hotelData, featuredPartnerData] =
          await Promise.all([
            restaurantRes.json(),
            barRes.json(),
            hotelRes.json(),
            featuredPartnerRes.ok ? featuredPartnerRes.json() : null,
          ]);

        if (cancelled) return;

        setWeekendPlaces({
          restaurant: restaurantData.places || [],
          bar: barData.places || [],
          hotel: hotelData.places || [],
        });
        setWeekendVenue(restaurantData.venue || null);
        setFeaturedPartner(featuredPartnerData || null);
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Game weekend places failed:", err);
        setWeekendPlaces({
          restaurant: [],
          bar: [],
          hotel: [],
        });
        setWeekendVenue(null);
        setFeaturedPartner(null);
        setWeekendPlacesError(
          "Restaurants and bars could not be loaded for this game."
        );
      } finally {
        if (!cancelled) {
          setWeekendPlacesLoading(false);
        }
      }
    }

    loadWeekendPlaces();

    

    return () => {
      cancelled = true;
      controller.abort();
    };
   }, [
    selectedFootballGame?.venueId,
    selectedFootballGame?.id,
    activeTrip?.venueId,
  ]);

  useEffect(() => {
    if (activeTrip?.id) {
      fetchStops(activeTrip.id);
    } else {
      setStops([]);
    }
  }, [activeTrip?.id, fetchStops]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadTripStats() {
      if (!activeTrip?.start || !activeTrip?.end) {
        setTripStats(null);
        setRouteGeometry([]);
        return;
      }

      setTripStats({
        distance: "Calculating...",
        driveTime: "Calculating...",
      });
      setRouteGeometry([]);

      try {
        const [startCoords, endCoords] = await Promise.all([
          geocodePlace(activeTrip.start, controller.signal),
          geocodePlace(activeTrip.end, controller.signal),
        ]);

        const orderedStops = stops
          .filter((stop) => stop.is_route_stop !== false)
          .filter(isValidCoordinate)
          .sort((a, b) => a.order_index - b.order_index)
          .map((stop) => ({
            latitude: Number(stop.latitude),
            longitude: Number(stop.longitude),
          }));

        const route = await fetchRoadRoute(
          [startCoords, ...orderedStops, endCoords],
          controller.signal
        );

        if (cancelled) return;

        setTripStats(formatTripStats(route));
        setRouteGeometry(route.geometry || []);
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Trip stats failed:", err);
        setTripStats({
          distance: "Road route unavailable",
          driveTime: "Road route unavailable",
        });
        setRouteGeometry([]);
      }
    }

        


    loadTripStats();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeTrip?.start, activeTrip?.end, stops]);

  useEffect(() => {
  let cancelled = false;
  const controller = new AbortController();

  async function loadGameDayGuide() {
    const venueId =
      selectedFootballGame?.venueId || activeTrip?.venueId;

    if (!venueId) {
      setGameDayGuide(null);
      setGameDayGuideError("");
      return;
    }

    try {
      setGameDayGuideLoading(true);
      setGameDayGuideError("");

      const res = await fetch(
        `${API_BASE_URL}/football/venues/${venueId}/game-day-guide`,
        { signal: controller.signal }
      );

      if (res.status === 404) {
        if (!cancelled) {
          setGameDayGuide(null);
        }
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load game day guide");
      }

      const data = await res.json();

      if (!cancelled) {
        setGameDayGuide(data);
      }
    } catch (err) {
      if (cancelled || err?.name === "AbortError") return;

      console.error("Game day guide failed:", err);
      setGameDayGuide(null);
      setGameDayGuideError(
        "Game day information could not be loaded."
      );
    } finally {
      if (!cancelled) {
        setGameDayGuideLoading(false);
      }
    }
  }

  loadGameDayGuide();

  return () => {
    cancelled = true;
    controller.abort();
  };
}, [selectedFootballGame?.venueId, activeTrip?.venueId]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadAlongTheWay() {
      if (
        !activeTrip?.id ||
        !Array.isArray(routeGeometry) ||
        routeGeometry.length < 2
      ) {
        setAlongTheWay({
          restaurant: [],
          hotel: [],
          historic: [],
        });
        setAlongTheWayError("");
        return;
      }

      try {
        setAlongTheWayLoading(true);
        setAlongTheWayError("");

        const requestCategory = async (category) => {
          const maxGeometryPoints = 200;

          const step = Math.max(
            1,
            Math.floor(routeGeometry.length / maxGeometryPoints)
          );

          const sampledGeometry = routeGeometry.filter(
            (_, index) =>
              index % step === 0 ||
              index === routeGeometry.length - 1
          );

          const res = await fetch(`${API_BASE_URL}/football/along-the-way`, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              geometry: sampledGeometry,
              category,
            }),
          });

          if (!res.ok) {
            throw new Error(`Failed to load ${category} recommendations`);
          }

          return res.json();
        };

        const [restaurantData, hotelData, historicData] = await Promise.all([
          requestCategory("restaurant"),
          requestCategory("hotel"),
          requestCategory("historic"),
        ]);

        if (cancelled) return;

        setAlongTheWay({
          restaurant: restaurantData.places || [],
          hotel: hotelData.places || [],
          historic: historicData.places || [],
        });
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Along the Way failed:", err);
        setAlongTheWay({
          restaurant: [],
          hotel: [],
          historic: [],
        });
        setAlongTheWayError(
          "Along-the-way recommendations could not be loaded for this route."
        );
      } finally {
        if (!cancelled) {
          setAlongTheWayLoading(false);
        }
      }
    }

    loadAlongTheWay();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeTrip?.id, routeGeometry]);

  async function handleSubmit(e) {
    e.preventDefault();

    const name = tripName.trim();
    const s = start.trim();
    const en = end.trim();
    const n = notes.trim();

    if (!s || !en) return;

    try {
      const res = await authFetch(
        `${API_BASE_URL}/trips`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          title: name || `${s} → ${en}`,
          start_location: s,
          end_location: en,
          notes: n,
          }),
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to create trip");
      }

      const createdTrip = await res.json();

      await fetchTrips();
      setActiveTripId(Number(createdTrip.id));
      navigateTo("trip-hq");

      setTripName("");
      setStart("");
      setEnd("");
      setNotes("");
    } catch (err) {
      console.error("Create trip failed:", err);
    }
  }

  async function handleFootballTripSubmit(e) {
    e.preventDefault();

    const s = footballStart.trim();

    if (!selectedFootballTeam || !selectedFootballGame || !s) {
      setFootballError(
        "Choose a team, choose an away game, and enter your starting location."
      );
      return;
    }

    try {
      setFootballLoading(true);
      setFootballError("");

      const venueRes = await fetch(
        `${API_BASE_URL}/football/venues/${selectedFootballGame.venueId}`
      );

      if (!venueRes.ok) {
        throw new Error("Failed to load stadium details");
      }

      const venue = await venueRes.json();

      const destinationParts = [
        venue.name,
        venue.city,
        venue.state,
      ].filter(Boolean);

      const destination = destinationParts.join(", ");

      if (!destination) {
        throw new Error("Stadium destination is unavailable");
      }

      const matchup = `${selectedFootballGame.awayTeam} @ ${selectedFootballGame.homeTeam}`;
      const gameDate = formatGameDate(
        selectedFootballGame.startDate,
        selectedFootballGame.startTimeTBD
      );

      if (!auth) {
        const previewTrip = {
          id: null,
          title: matchup,
          start: s,
          end: destination,
          notes: `${gameDate} · ${venue.name}`,
          isPreview: true,
        };

        setStops([]);
        setTrips((currentTrips) => [
          ...currentTrips.filter((trip) => trip.id !== null),
          previewTrip,
        ]);
        setActiveTripId(null);
        navigateTo("trip-hq");
        return;
      }

      const tripRes = await authFetch(
        `${API_BASE_URL}/trips`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          title: matchup,
          start_location: s,
          end_location: destination,
          notes: `${gameDate} · ${venue.name}`,
          venue_id: selectedFootballGame.venueId,
          }),
        },
        auth.token
      );

      if (!tripRes.ok) {
        throw new Error("Failed to create football road trip");
      }

      const createdTrip = await tripRes.json();

      await fetchTrips();
      setActiveTripId(Number(createdTrip.id));
      navigateTo("trip-hq");

      setStart("");
      setEnd("");
      setTripName("");
      setNotes("");
    } catch (err) {
      console.error("Football trip creation failed:", err);
      setFootballError(
        "The football road trip could not be created. Check the backend and try again."
      );
    } finally {
      setFootballLoading(false);
    }
  }

  async function handleAddStop(e) {
    e.preventDefault();

    if (!activeTrip) return;

    const name = stopName.trim();
    const n = stopNotes.trim();

    if (!name) return;

    try {
      const coords = await geocodePlace(name);

      const res = await authFetch(
        `${API_BASE_URL}/trips/${activeTrip.id}/stops`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          name,
          location_type: stopType,
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: n,
          trivia: stopTrivia.trim(),
          rating: stopRating,
          is_route_stop: true,
          }),
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to add stop");
      }

      await fetchStops(activeTrip.id);

      setStopName("");
      setStopType("waypoint");
      setStopRating("");
      setStopNotes("");
      setStopTrivia("");
    } catch (err) {
      console.error("Add stop failed:", err);
      alert("Could not find that location. Try a city and state, like Waco, TX.");
    }
  }

  function isSuggestedStopAdded(place) {
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);

    return stops.some((stop) => {
      const stopLatitude = Number(stop.latitude);
      const stopLongitude = Number(stop.longitude);

      return (
  normalizePlaceName(stop.name) === normalizePlaceName(place.name) &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(stopLatitude - latitude) < 0.00001 &&
  Math.abs(stopLongitude - longitude) < 0.00001
);
    });
  }

  async function addSuggestedStop(place, locationType) {
    if (!activeTrip) return;

    if (isSuggestedStopAdded(place)) {
      return;
    }

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      alert("This recommendation does not have usable coordinates.");
      return;
    }

    if (!auth) {
      setStops((currentStops) => [
        ...currentStops,
        {
          id: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: place.name,
          location_type: locationType,
          latitude,
          longitude,
          notes: place.address || "",
          description: "",
          avg_rating: place.rating || null,
          order_index: currentStops.length,
          is_route_stop: false,
          isGuestStop: true,
        },
      ]);
      return;
    }

    try {
      const res = await authFetch(
        `${API_BASE_URL}/trips/${activeTrip.id}/stops`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          name: place.name,
          location_type: locationType,
          latitude,
          longitude,
          notes: place.address || "",
          trivia: "",
          rating: "",
          is_route_stop: false,
          }),
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to add suggested stop");
      }

      await fetchStops(activeTrip.id);
    } catch (err) {
  console.error("Add suggested stop failed:", err);
  alert(err.message || "Could not add this recommendation to the trip.");
}
}

  async function setStopRouteStatus(id, isRouteStop) {
    if (!activeTrip || !auth?.token) return;

    try {
      const res = await authFetch(
        `${API_BASE_URL}/stops/${id}/route`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_route_stop: isRouteStop,
          }),
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to update route status");
      }

      await fetchStops(activeTrip.id);
    } catch (err) {
      console.error("Route status update failed:", err);
      alert("Could not update this place on the route.");
    }
  }

  async function moveStop(id, direction) {
    if (!activeTrip) return;

    try {
      const res = await authFetch(
        `${API_BASE_URL}/stops/${id}/order`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ direction }),
        },
        auth.token
      );

      if (!res.ok) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || "Failed to move stop");
}

      await fetchStops(activeTrip.id);
    } catch (err) {
      console.error("Move stop failed:", err);
    }
  }

  async function deleteStop(id) {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/stops/${id}`,
        {
          method: "DELETE",
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to delete stop");
      }

      setStops((prev) => prev.filter((stop) => stop.id !== id));
    } catch (err) {
      console.error("Delete stop failed:", err);
    }
  }

  async function toggleFavorite(id) {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/trips/${id}/favorite`,
        {
          method: "PATCH",
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to update favorite");
      }

      const updatedTrip = await res.json();

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === id
            ? { ...trip, isFavorite: Boolean(updatedTrip.is_favorite) }
            : trip
        )
      );
    } catch (err) {
      console.error("Favorite update failed:", err);
    }
  }

  async function deleteTrip(id) {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/trips/${id}`,
        {
          method: "DELETE",
        },
        auth.token
      );

      if (!res.ok) {
        throw new Error("Failed to delete trip");
      }

      setTrips((prev) => {
        const next = prev.filter((t) => t.id !== id);

        if (id === activeTripId) {
          setActiveTripId(next[0]?.id ?? null);
        }

        return next;
      });
    } catch (err) {
      console.error("Delete trip failed:", err);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();

    const email = authEmail.trim().toLowerCase();
    const username = authUsername.trim();

    if (!email || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }

    if (authMode === "register" && !username) {
      setAuthError("Username is required.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError("");

      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const payload =
        authMode === "register"
          ? {
              username,
              email,
              password: authPassword,
            }
          : {
              email,
              password: authPassword,
            };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      const nextAuth = {
        token: data.token,
        user: data.user,
      };

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(nextAuth)
      );

      setAuth(nextAuth);
      setAuthPassword("");
      setAuthError("");
    } catch (err) {
      console.error("Authentication failed:", err);
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
    setTrips([]);
    setStops([]);
    setActiveTripId(null);
    setAuthPassword("");
    setAuthError("");
  }

  const mapStart = start.trim() || activeTrip?.start || "";
  const mapEnd = end.trim() || activeTrip?.end || "";
  const hasTrip = Boolean(activeTrip);
  const hasRoute = hasTrip && routeGeometry.length > 1;
  const hasGameWeekend = Boolean(selectedFootballGame || activeTrip?.venueId);
  const isPlanScreen = PLAN_SCREEN_IDS.includes(activeScreen);
  const workspacePartner =
    featuredPartner && !isRetiredPartner(featuredPartner)
      ? featuredPartner
      : import.meta.env.DEV
        ? DEVELOPMENT_PARTNER_PREVIEW
        : KICKOFF_MILES_HOUSE_AD;

  function canAccessScreen(screenId) {
    if (screenId === "drive") return hasRoute;
    if (screenId === "choose-game") return Boolean(selectedFootballTeam);
    if (screenId === "trip-hq") {
      return hasTrip;
    }
    if (["plan-route-schedule", "plan-along-the-way", "plan-stay-itinerary"].includes(screenId)) {
      return hasRoute;
    }
    if (["game-weekend", "game-day"].includes(screenId)) {
      return hasGameWeekend;
    }
    return true;
  }

  return (
    <div className={`page${activeScreen === "home" ? " is-home" : ""}`}>
      <Background team={backgroundTeam} />
    <div className={`app${activeScreen === "home" ? " is-home" : ""}${
      activeScreen === "choose-team" ? " is-choose-team" : ""
    }${
      activeScreen === "choose-game" ? " is-choose-game" : ""
    }${
      activeScreen === "trip-hq" ? " is-trip-hq" : ""
    }${
      isPlanScreen ? " is-plan" : ""
    }${
      activeScreen === "drive" ? " is-drive" : ""
    }`}>
      {!["home", "choose-team", "choose-game", "trip-hq"].includes(activeScreen) &&
      !isPlanScreen ? (
        <JourneyNavigation
        activeScreen={activeScreen}
        canAccess={canAccessScreen}
        onNavigate={navigateTo}
      />
      ) : null}

      <HomeScreen active={activeScreen === "home"}>
      <HomeExperience
        accountLabel={
          auth
            ? `Account: ${auth.user?.username || auth.user?.email}`
            : "Sign in to save your trips"
        }
        onChooseTeam={() => navigateTo("choose-team")}
      >
        <div className="panel account-panel">
          <h2 className="panel-title">
            {auth ? "Your Account" : "Sign In to Save Your Trips"}
          </h2>

          {auth ? (
            <div className="trip-details-panel account-summary">
              <p>
                <strong>Signed in:</strong>{" "}
                {auth.user?.username || auth.user?.email}
              </p>
              <button
                type="button"
                className="ghost-button"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="trip-form">
              {authMode === "register" ? (
                <input
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Username"
                  className="trip-input"
                  autoComplete="username"
                />
              ) : null}

              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email"
                className="trip-input"
                autoComplete="email"
              />

              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                className="trip-input"
                autoComplete={
                  authMode === "register"
                    ? "new-password"
                    : "current-password"
                }
              />

              {authError ? (
                <p className="error-state">{authError}</p>
              ) : null}

              <button
                type="submit"
                className="primary-button"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "register"
                    ? "Create Account"
                    : "Sign In"}
              </button>

              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setAuthMode((current) =>
                    current === "login" ? "register" : "login"
                  );
                  setAuthError("");
                }}
              >
                {authMode === "login"
                  ? "Need an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </form>
          )}
        </div>
        <div
          id="saved-trips"
          className="panel saved-trips-panel"
          style={{ display: auth ? undefined : "none" }}
        >
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">YOUR ACCOUNT</span>
              <h2 className="panel-title">Saved Trips</h2>
              <p className="section-copy">
                Reopen a trip, mark a favorite, or remove one you no longer need.
              </p>
            </div>
          </div>

          {tripsError ? (
            <p className="error-state">{tripsError}</p>
          ) : trips.length === 0 ? (
            <p className="empty-state">No trips yet. Add your first one above.</p>
          ) : (
            <ul className="trip-list">
              {[...trips]
                .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
                .map((trip) => {
                  const isActive = trip.id === activeTripId;

                  return (
                    <li
                      key={trip.id}
                      className={`trip-row${isActive ? " is-active" : ""}`}
                      onClick={() => {
                      setSelectedFootballGameId("");
                      setSelectedFootballTeam("");
                      setFootballGames([]);
                      setActiveTripId(trip.id);
                      navigateTo("trip-hq");
}}
                    >
                      <div className="trip-details">
                        <span className="trip-name">{trip.name}</span>

                        <span className="trip-route">
                          {trip.start} → {trip.end}
                        </span>

                        {trip.notes && (
                          <span className="trip-notes-text">{trip.notes}</span>
                        )}
                      </div>

                      <div className="trip-actions">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(trip.id);
                          }}
                        >
                          {trip.isFavorite ? "★" : "☆"}
                        </button>

                        <button
                          className="ghost-button"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrip(trip.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

      </HomeExperience>
      </HomeScreen>

        {(["choose-team", "choose-game"].includes(activeScreen)) ? (
        <div className={`panel planner-panel${
          activeScreen === "choose-team"
            ? " choose-team-panel"
            : " choose-game-panel"
        }`}>
          <form onSubmit={handleFootballTripSubmit} className="trip-form planner-form">
            <ChooseTeamScreen active={activeScreen === "choose-team"}>
            <ChooseTeamExperience
              error={footballTeams.length === 0 ? footballError : ""}
              loading={footballTeamsLoading}
              onBack={() => navigateTo("home")}
              onSelectTeam={(school) => {
                setSelectedFootballTeam(school);
                navigateTo("choose-game");
              }}
              selectedTeam={selectedFootballTeam}
              teams={footballTeams}
            />
            </ChooseTeamScreen>

            <ChooseGameScreen active={activeScreen === "choose-game"}>
            <ChooseGameExperience
              authenticated={Boolean(auth)}
              dailyDriveHours={dailyDriveHours}
              error={footballError}
              games={footballGames}
              loading={footballLoading}
              onBack={() => navigateTo("choose-team")}
              onDailyDriveHoursChange={setDailyDriveHours}
              onSelectGame={setSelectedFootballGameId}
              onStartChange={setFootballStart}
              season={FOOTBALL_SEASON}
              selectedGame={selectedFootballGame}
              selectedGameId={selectedFootballGameId}
              selectedTeam={selectedFootballTeam}
              start={footballStart}
              teams={footballTeams}
            />
            </ChooseGameScreen>
          </form>
        </div>
        ) : null}

        {activeTrip && routeGeometry.length > 1 &&
        ["plan-route-schedule", "plan-along-the-way"].includes(activeScreen) ? (
          <PlanWorkspace
            activeSection={activeScreen}
            game={selectedFootballGame}
            onNavigate={navigateTo}
            trip={activeTrip}
          >
          <div className={`panel along-panel${
            activeScreen === "plan-route-schedule" ? " is-route-plan" : " is-along-plan"
          }`}>

            <PlanRouteScheduleScreen active={activeScreen === "plan-route-schedule"}>
            <div className="plan-section-heading">
              <span className="section-kicker">HERE’S YOUR ROAD TRIP</span>
              <h2>{activeTrip.start} → {activeTrip.end}</h2>
            </div>
            <div className="plan-route-layout">
              <div className="plan-route-map" aria-label="Road trip route map">
                <TripMap
                  start={mapStart}
                  end={mapEnd}
                  stops={stops.filter((stop) => stop.is_route_stop !== false)}
                  routeGeometry={routeGeometry}
                />
              </div>
              <div className="plan-route-summary">
            <div className="trip-result-card">
              <div className="trip-result-main">
                <span className="trip-result-eyebrow">GAME ROAD TRIP</span>

                {selectedFootballGame ? (
                  <h3 className="trip-result-matchup">
                    {selectedFootballGame.awayTeam}
                    <span className="matchup-at"> @ </span>
                    {selectedFootballGame.homeTeam}
                  </h3>
                ) : null}

                <p className="trip-result-journey">
                  <span>{activeTrip.start}</span>
                  <span className="journey-arrow">→</span>
                  <span>{activeTrip.end}</span>
                </p>
              </div>

              <div className="trip-stat-grid">
                <div className="trip-stat">
                  <span className="trip-stat-label">Road Distance</span>
                  <strong className="trip-stat-value">
                    {tripStats?.distance || "Calculating..."}
                  </strong>
                </div>

                <div className="trip-stat">
                  <span className="trip-stat-label">Drive Time</span>
                  <strong className="trip-stat-value">
                    {tripStats?.driveTime || "Calculating..."}
                  </strong>
                </div>

                <div className="trip-stat">
                  <span className="trip-stat-label">Travel Plan</span>
                  <strong className="trip-stat-value">
                    {dailyDriveHours === "straight"
                      ? "Straight through"
                      : overnightTargets.length > 0
                        ? `${overnightTargets.length + 1} days`
                        : "1 day"}
                  </strong>
                </div>
              </div>
            </div>
            <PartnerPlacement
              contextLabel="Road Trip Partner"
              partner={workspacePartner}
            />
              </div>
            </div>
            </PlanRouteScheduleScreen>

            <PlanAlongTheWayScreen active={activeScreen === "plan-along-the-way"}>
            <div className="plan-section-heading">
              <span className="section-kicker">DISCOVER THE ROAD</span>
              <h2>Along the Way</h2>
              <p>Food, stays, and memorable stops matched to your route.</p>
            </div>
            <PartnerPlacement
              contextLabel="Along the Way"
              partner={workspacePartner}
            />
            {alongTheWayLoading ? (
              <p className="empty-state">
                Finding food, hotels, and historic stops along your route...
              </p>
            ) : alongTheWayError ? (
              <p className="error-state">{alongTheWayError}</p>
            ) : (
              <>
              <div className="along-the-way-grid">
                <div className="recommendation-column">
                  <h3 className="game-weekend-heading">
                    🍴 Food Worth Stopping For
                  </h3>

                  {alongTheWay.restaurant.length === 0 ? (
                    <p className="empty-state">
                      No restaurant recommendations returned.
                    </p>
                  ) : (
                    <ul className="trip-list">
                      {orderedRestaurants.slice(0, showAllAlong ? 6 : 3).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>
                            <span className="trip-route">
                              {place.rating ? `${place.rating} ★` : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>
                            <span className="along-progress">
                              {formatRouteProgress(place.routeProgress, travelDayCount)}
                            </span>
                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}
                            <div className="recommendation-actions">
                              <button
                                type="button"
                                className={`ghost-button${
                                  isSuggestedStopAdded(place) ? " is-added" : ""
                                }`}
                                disabled={isSuggestedStopAdded(place)}
                                onClick={() =>
                                  addSuggestedStop(place, "restaurant")
                                }
                              >
                                {isSuggestedStopAdded(place)
                                  ? "✓ Saved"
                                  : "Save to Trip"}
                              </button>
                              {place.website ? (
                                <a
                                  className="place-link"
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Website
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="recommendation-column">
                  <h3 className="game-weekend-heading">
  🛏 {travelDayCount > 1 ? "Overnight Options" : "Hotels Along the Route"}
</h3>

                  {alongTheWay.hotel.length === 0 ? (
                    <p className="empty-state">
                      No hotel recommendations returned.
                    </p>
                  ) : (
                    <ul className="trip-list">
                      {prioritizedHotels.slice(0, showAllAlong ? 6 : 3).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>
                            <span className="trip-route">
                              {place.rating ? `${place.rating} ★` : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>
                            <span className="along-progress">
                              {formatRouteProgress(
                              place.routeProgress,
                              travelDayCount,
                                "hotel",
                              tripStats?.durationSeconds
)}
                            </span>
                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}
                            <div className="recommendation-actions">
                              <button
                                type="button"
                                className={`ghost-button${
                                  isSuggestedStopAdded(place) ? " is-added" : ""
                                }`}
                                disabled={isSuggestedStopAdded(place)}
                                onClick={() => addSuggestedStop(place, "hotel")}
                              >
                                {isSuggestedStopAdded(place)
                                  ? "✓ Saved"
                                  : "Save to Trip"}
                              </button>
                              {place.website ? (
                                <a
                                  className="place-link"
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Website
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="recommendation-column">
                  <h3 className="game-weekend-heading">
                    🏛 Historic & Interesting
                  </h3>

                  {alongTheWay.historic.length === 0 ? (
                    <p className="empty-state">
                      No historic recommendations returned.
                    </p>
                  ) : (
                    <ul className="trip-list">
                      {orderedHistoric.slice(0, showAllAlong ? 6 : 3).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>
                            <span className="trip-route">
                              {place.rating ? `${place.rating} ★` : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>
                            <span className="along-progress">
                              {formatRouteProgress(place.routeProgress, travelDayCount)}
                            </span>
                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}
                            <div className="recommendation-actions">
                              <button
                                type="button"
                                className={`ghost-button${
                                  isSuggestedStopAdded(place) ? " is-added" : ""
                                }`}
                                disabled={isSuggestedStopAdded(place)}
                                onClick={() =>
                                  addSuggestedStop(place, "historic")
                                }
                              >
                                {isSuggestedStopAdded(place)
                                  ? "✓ Saved"
                                  : "Save to Trip"}
                              </button>
                              {place.website ? (
                                <a
                                  className="place-link"
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Website
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(alongTheWay.restaurant.length > 3 ||
                prioritizedHotels.length > 3 ||
                alongTheWay.historic.length > 3) ? (
                <div className="recommendation-expand-row">
                  <button
                    type="button"
                    className="recommendation-expand-button"
                    onClick={() => setShowAllAlong((current) => !current)}
                  >
                    {showAllAlong
                      ? "Show fewer road trip stops"
                      : "Show more road trip stops"}
                  </button>
                </div>
              ) : null}
              </>
            )}
            </PlanAlongTheWayScreen>
          </div>
          </PlanWorkspace>
        ) : null}

        <div className="trip-planning-layout">


        {activeTrip && routeGeometry.length > 1 &&
        activeScreen === "plan-stay-itinerary" ? (

  <PlanStayItineraryScreen active>
  <PlanWorkspace
    activeSection={activeScreen}
    game={selectedFootballGame}
    onNavigate={navigateTo}
    trip={activeTrip}
  >
  <div className="panel plan-itinerary-panel">
    <div className="plan-section-heading">
      <div>
        <span className="section-kicker">YOUR TRAVEL PLAN</span>
        <h2>Day-by-Day Itinerary</h2>
        <p>
          A suggested road trip plan based on your route and daily driving preference.
        </p>
      </div>
    </div>

    <PartnerPlacement
      contextLabel="Stay & Itinerary"
      partner={workspacePartner}
    />

    <div className="trip-stop-groups plan-itinerary-timeline">
      {dayByDayPlan.map((day) => (
        <div key={day.dayNumber} className="trip-stop-group plan-itinerary-day">
          <div className="plan-day-marker" aria-hidden="true">{day.dayNumber}</div>
          <div className="plan-day-content">
          <span className="section-kicker">DAY {day.dayNumber}</span>
          <h3 className="workspace-heading">Day {day.dayNumber} of {travelDayCount}</h3>

          <ul className="trip-list">
            {day.restaurant ? (
              <li className="trip-row">
  <div className="trip-details">
    <span className="stop-badge">FOOD</span>

    <span className="trip-name">
      {day.restaurant.name}
    </span>

    {day.restaurant.address ? (
      <span className="trip-notes-text">
        {day.restaurant.address}
      </span>
    ) : null}
  </div>

  <div className="trip-actions">
    <button
      type="button"
      className={`ghost-button${
        isSuggestedStopAdded(day.restaurant) ? " is-added" : ""
      }`}
      disabled={isSuggestedStopAdded(day.restaurant)}
      onClick={() =>
        addSuggestedStop(day.restaurant, "restaurant")
      }
    >
      {isSuggestedStopAdded(day.restaurant)
        ? "✓ Saved"
        : "Save to Trip"}
    </button>
  </div>
</li>
            ) : null}

            {day.historic ? (
              <li className="trip-row">
                <div className="trip-details">
                  <span className="stop-badge">STOP</span>
                  <span className="trip-name">
                    {day.historic.name}
                  </span>
                  {day.historic.address ? (
                    <span className="trip-notes-text">
                      {day.historic.address}
                    </span>
                  ) : null}
                </div>
              </li>
            ) : null}

            {day.hotel ? (
              <li className="trip-row">
                <div className="trip-details">
                  <span className="stop-badge">OVERNIGHT</span>
                  <span className="trip-name">
                    {day.hotel.name}
                  </span>
                  {day.hotel.address ? (
                    <span className="trip-notes-text">
                      {day.hotel.address}
                    </span>
                  ) : null}
                </div>
              </li>
            ) : (
              <li className="trip-row">
                <div className="trip-details">
                  <span className="stop-badge">
                    {day.dayNumber === travelDayCount
                      ? "DESTINATION"
                      : "DAY COMPLETE"}
                  </span>
                  <span className="trip-name">
                    {day.dayNumber === travelDayCount
                      ? activeTrip.end
                      : "Continue your road trip"}
                  </span>
                </div>
              </li>
            )}
          </ul>
          </div>
        </div>
      ))}
        </div>
  </div>
  </PlanWorkspace>
  </PlanStayItineraryScreen>
) : null}

        </div>



        {activeTrip && activeScreen === "trip-hq" ? (
        <TripHqScreen active>
        <TripHqExperience
          game={selectedFootballGame}
          hasDrive={hasRoute}
          hasGameWeekend={hasGameWeekend}
          hasRoute={hasRoute}
          onBack={() =>
            navigateTo(selectedFootballTeam ? "choose-game" : "home")
          }
          onNavigate={navigateTo}
          travelPlan={travelPlanDescription}
          trip={activeTrip}
          tripStats={tripStats}
        >
        <PartnerPlacement
          contextLabel="Featured Road Trip Partner"
          partner={workspacePartner}
        />
        <div className="panel trip-workspace-panel">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">ROUTE & PLACES</span>
              <h2 className="panel-title">Your Trip Workspace</h2>
              <p className="section-copy">
                Review the route and manage the places connected to this trip.
              </p>
            </div>
          </div>

          <div className="trip-workspace-grid">
            <div className="trip-map-section">
              <h3 className="workspace-heading">Route Map</h3>
              <TripMap
  start={mapStart}
  end={mapEnd}
  stops={stops.filter((stop) => stop.is_route_stop !== false)}
  routeGeometry={routeGeometry}
/>
            </div>

            <div className="trip-summary-section">
              <h3 className="workspace-heading">Trip Summary</h3>

          {!activeTrip ? (
            <p className="empty-state">Select a trip.</p>
          ) : (
            <div className="trip-details-panel">
              <p>
                <strong>Name:</strong> {activeTrip.name}
              </p>

              <p>
                <strong>Start:</strong> {activeTrip.start}
              </p>

              <p>
                <strong>End:</strong> {activeTrip.end}
              </p>

              <p>
                <strong>Notes:</strong> {activeTrip.notes || "None"}
              </p>

              <p>
                <strong>Road Distance:</strong> {tripStats?.distance}
              </p>

              <p>
                <strong>Road Drive Time:</strong> {tripStats?.driveTime}
              </p>

              <p>
                <strong>Travel Plan:</strong>{" "}
                {travelPlanDescription}
              </p>

              <button
                className="ghost-button"
                style={{ display: auth ? undefined : "none" }}
                onClick={() => deleteTrip(activeTrip.id)}
              >
                Delete Trip
              </button>
            </div>
          )}
            </div>
          </div>

          <div
            className="trip-stops-section"
            style={{ display: auth ? undefined : "none" }}
          >
            <div className="section-heading-row compact-heading-row">
              <div>
                <span className="section-kicker">YOUR ITINERARY</span>
                <h3 className="workspace-heading">Build Your Itinerary</h3>
              </div>
            </div>

          {stopsError ? (
            <p className="error-state">{stopsError}</p>
          ) : !activeTrip ? (
            <p className="empty-state">Select a trip to add stops.</p>
          ) : (
            <>
              <form onSubmit={handleAddStop} className="trip-form">
                <input
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  placeholder="Stop name (e.g., Dallas, TX)"
                  className="trip-input"
                />

                <select
                  value={stopType}
                  onChange={(e) => setStopType(e.target.value)}
                  className="trip-input compact-input"
                  aria-label="Stop type"
                >
                  <option value="waypoint">Waypoint</option>
                  <option value="historic">Historic</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="scenic">Scenic</option>
                  <option value="museum">Museum</option>
                </select>

                <select
                  value={stopRating}
                  onChange={(e) => setStopRating(e.target.value)}
                  className="trip-input compact-input"
                  aria-label="Rating"
                >
                  <option value="">No rating</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>

                <textarea
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Stop notes (optional)"
                  className="trip-input trip-notes"
                  rows={2}
                />

                <textarea
                  value={stopTrivia}
                  onChange={(e) => setStopTrivia(e.target.value)}
                  placeholder="Fun trivia or historic context (optional)"
                  className="trip-input trip-notes"
                  rows={2}
                />

                <button type="submit" className="primary-button">
                  Add Stop
                </button>
              </form>

              {stops.length === 0 ? (
                <p className="empty-state">No stops added yet.</p>
              ) : (
                <div className="trip-stop-groups">
                  <div className="trip-stop-group">
                    <h4 className="trip-stop-group-heading">Your Route</h4>
                    <ul className="trip-list">
  <li className="trip-row itinerary-endpoint">
    <div className="trip-details">
      <span className="stop-badge">START</span>
      <span className="trip-name">{activeTrip.start}</span>
    </div>
  </li>

  {stops
    .filter((stop) => stop.is_route_stop !== false)
    .map((stop, index) => (
      <li key={stop.id} className="trip-row">
        <div className="trip-details">
          <span className="trip-name">
            Stop {index + 1} · {stop.name}
          </span>

          <span className="stop-meta">
            <span className="stop-badge">
              {stop.location_type || "waypoint"}
            </span>

            {stop.avg_rating ? (
              <span className="stop-rating">
                Rating: {stop.avg_rating}/5
              </span>
            ) : null}
          </span>

          {stop.notes && (
            <span className="trip-notes-text">
              {stop.notes}
            </span>
          )}

          {stop.description && (
            <span className="trip-trivia-text">
              Trivia: {stop.description}
            </span>
          )}
        </div>

        <div className="trip-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => moveStop(stop.id, "up")}
          >
            ↑
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={() => moveStop(stop.id, "down")}
          >
            ↓
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={() =>
              setStopRouteStatus(stop.id, false)
            }
          >
            Save Only
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={() => deleteStop(stop.id)}
          >
            Delete
          </button>
        </div>
      </li>
    ))}

  <li className="trip-row itinerary-endpoint">
    <div className="trip-details">
      <span className="stop-badge">DESTINATION</span>
      <span className="trip-name">{activeTrip.end}</span>
    </div>
  </li>
</ul>
                    
                  </div>

                  <div className="trip-stop-group">
  <h4 className="trip-stop-group-heading">Saved Places</h4>

  {stops.filter((stop) => stop.is_route_stop === false).length === 0 ? (
    <p className="empty-state">No saved places yet.</p>
  ) : (
    <>
      {[
        {
          type: "restaurant",
          label: "🍴 Food",
        },
        {
          type: "bar",
          label: "🍺 Fan Bars",
        },
        {
          type: "hotel",
          label: "🛏 Hotels",
        },
        {
          type: "historic",
          label: "🏛 Historic Stops",
        },
      ].map((group) => {
        const groupStops = stops.filter(
          (stop) =>
            stop.is_route_stop === false &&
            stop.location_type === group.type
        );

        if (groupStops.length === 0) {
          return null;
        }

        return (
          <div key={group.type} className="saved-place-category">
            <h5 className="saved-place-category-heading">
              {group.label}
            </h5>

            <ul className="trip-list">
              {groupStops.map((stop) => (
                <li key={stop.id} className="trip-row">
                  <div className="trip-details">
                    <span className="trip-name">{stop.name}</span>

                    <span className="stop-meta">
                      <span className="stop-badge">
                        Saved · {stop.location_type || "place"}
                      </span>

                      {stop.avg_rating ? (
                        <span className="stop-rating">
                          Rating: {stop.avg_rating}/5
                        </span>
                      ) : null}
                    </span>

                    {stop.notes && (
                      <span className="trip-notes-text">
                        {stop.notes}
                      </span>
                    )}
                  </div>

                  <div className="trip-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setStopRouteStatus(stop.id, true)
                      }
                    >
                      Add to Route
                    </button>

                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => deleteStop(stop.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {stops
        .filter(
          (stop) =>
            stop.is_route_stop === false &&
            !["restaurant", "bar", "hotel", "historic"].includes(
              stop.location_type
            )
        )
        .map((stop) => (
          <ul key={stop.id} className="trip-list">
            <li className="trip-row">
              <div className="trip-details">
                <span className="trip-name">{stop.name}</span>

                <span className="stop-meta">
                  <span className="stop-badge">
                    Saved · {stop.location_type || "place"}
                  </span>

                  {stop.avg_rating ? (
                    <span className="stop-rating">
                      Rating: {stop.avg_rating}/5
                    </span>
                  ) : null}
                </span>

                {stop.notes && (
                  <span className="trip-notes-text">
                    {stop.notes}
                  </span>
                )}
              </div>

              <div className="trip-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setStopRouteStatus(stop.id, true)
                  }
                >
                  Add to Route
                </button>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => deleteStop(stop.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
                        ))}
                      </>
                          )}
                    </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
        </TripHqExperience>
        </TripHqScreen>
        ) : null}

        

            

        

{hasGameWeekend && ["game-weekend", "game-day"].includes(activeScreen) ? (
          <>
          <GameWeekendScreen active={activeScreen === "game-weekend"}>
          <div className="panel destination-panel">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">DESTINATION</span>
                <h2 className="panel-title">Game Weekend</h2>
              </div>
            </div>

            <div className="trip-details-panel">
              <p>
                <strong>Destination:</strong>{" "}
                {gameDayGuide?.venueName ||
                weekendVenue?.name ||
                selectedFootballGame?.venue ||
                activeTrip?.end ||
              "Venue TBD"}
              </p>
              <p>
                <strong>Host:</strong>{" "}
                {gameDayGuide?.homeTeam ||
                selectedFootballGame?.homeTeam ||
            "College Football Destination"}
              </p>
            </div>

            {weekendVenue ? (
              <div className="destination-map-section">
                <div className="destination-map-heading">
                  <span className="section-kicker">EXPLORE THE DESTINATION</span>
                  <h3 className="workspace-heading">Game Weekend Map</h3>
                </div>

                <DestinationMap
                  venue={weekendVenue}
                  restaurants={weekendPlaces.restaurant}
                  bars={weekendPlaces.bar}
                  hotels={weekendPlaces.hotel}
                />
              </div>
            ) : null}
          </div>
          </GameWeekendScreen>

          <GameDayScreen active={activeScreen === "game-day"}>
          <div className="panel destination-panel">
            <div className="game-day-guide-panel">
              <div className="section-heading-row">
                <div>
                  <span className="section-kicker">GAME DAY</span>
                  <h2 className="panel-title">Your Game Day Guide</h2>
                </div>
              </div>

              <p className="game-day-guide-intro">
                Make the most of game day at{" "}
                <strong>
                  {gameDayGuide?.venueName ||
weekendVenue?.name ||
selectedFootballGame?.venue ||
activeTrip?.end ||
"the stadium"}
                </strong>
                . Here’s what to know before kickoff.
              </p>

              <div className="game-day-guide-grid">
                <button
                  type="button"
                  className="game-day-guide-card game-day-guide-card-button"
                  onClick={() =>
                    setOpenGameDaySection((current) =>
                      current === "tailgating" ? null : "tailgating"
                    )
                  }
                  aria-expanded={openGameDaySection === "tailgating"}
                >
                  <span className="game-day-guide-icon">🏈</span>
                  <h3>Tailgating</h3>
                  <p>
                    Find the best areas for pregame tailgating, fan gatherings,
                    parking-lot traditions, and visiting-fan activities.
                  </p>
                  <span className="game-day-guide-action">
                    {openGameDaySection === "tailgating"
                      ? "Hide tailgating guide ↑"
                      : "Explore tailgating →"}
                  </span>
                </button>

                <button
                  type="button"
                  className="game-day-guide-card game-day-guide-card-button"
                  onClick={() =>
                    setOpenGameDaySection((current) =>
                      current === "parkingArrival" ? null : "parkingArrival"
                    )
                  }
                  aria-expanded={openGameDaySection === "parkingArrival"}
                >
                  <span className="game-day-guide-icon">🚗</span>
                  <h3>Parking & Arrival</h3>
                  <p>
                    Know where to park, when to arrive, and how to make the final
                    approach to the stadium easier on game day.
                  </p>
                  <span className="game-day-guide-action">
                    {openGameDaySection === "parkingArrival"
                      ? "Hide parking guide ↑"
                      : "Explore parking & arrival →"}
                  </span>
                </button>

                <button
                  type="button"
                  className="game-day-guide-card game-day-guide-card-button"
                  onClick={() =>
                    setOpenGameDaySection((current) =>
                      current === "knowBeforeYouGo"
                        ? null
                        : "knowBeforeYouGo"
                    )
                  }
                  aria-expanded={openGameDaySection === "knowBeforeYouGo"}
                >
                  <span className="game-day-guide-icon">🎒</span>
                  <h3>Know Before You Go</h3>
                  <p>
                    Check stadium policies, bag rules, entry information, gates,
                    and other important details before heading inside.
                  </p>
                  <span className="game-day-guide-action">
                    {openGameDaySection === "knowBeforeYouGo"
                      ? "Hide stadium guide ↑"
                      : "Explore stadium information →"}
                  </span>
                </button>

                <button
                  type="button"
                  className="game-day-guide-card game-day-guide-card-button"
                  onClick={() =>
                    setOpenGameDaySection((current) =>
                      current === "traditions" ? null : "traditions"
                    )
                  }
                  aria-expanded={openGameDaySection === "traditions"}
                >
                  <span className="game-day-guide-icon">🔥</span>
                  <h3>
                    {selectedFootballGame?.homeTeam
                      ? `${selectedFootballGame.homeTeam} Traditions`
                      : "Game Day Traditions"}
                  </h3>
                  <p>
                    Discover the traditions, rituals, landmarks, and experiences
                    that make this college football destination unique.
                  </p>
                  <span className="game-day-guide-action">
                    {openGameDaySection === "traditions"
                      ? "Hide traditions ↑"
                      : "Explore traditions →"}
                  </span>
                </button>
              </div>

              {openGameDaySection ? (
                <div className="tailgating-guide-panel">
                  {gameDayGuideLoading ? (
                    <p className="empty-state">Loading game day guide...</p>
                  ) : gameDayGuideError ? (
                    <p className="error-state">{gameDayGuideError}</p>
                  ) : !gameDayGuide ? (
                    <p className="empty-state">
                      Game day information is being added for this destination.
                    </p>
                  ) : openGameDaySection === "tailgating" ? (
                    <>
                      <div className="tailgating-guide-heading">
                        <span className="section-kicker">TAILGATING</span>
                        <h3 className="workspace-heading">
                          Tailgating at {gameDayGuide.venueName || "the stadium"}
                        </h3>
                      </div>

                      <div className="tailgating-guide-grid">
                        {[
                          ["📍 Where to Tailgate", gameDayGuide.tailgating?.where],
                          ["⏰ When to Arrive", gameDayGuide.tailgating?.arrival],
                          ["📋 Tailgating Rules", gameDayGuide.tailgating?.rules],
                          ["🏈 Visiting Fans", gameDayGuide.tailgating?.visitors],
                        ].map(([heading, items]) => (
                          <div className="tailgating-guide-item" key={heading}>
                            <strong>{heading}</strong>
                            {Array.isArray(items) && items.length > 0 ? (
                              <ul>
                                {items.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <span>Information is being added.</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {gameDayGuide.tailgating?.sourceUrl ? (
                        <div className="tailgating-guide-source">
                          <a
                            href={gameDayGuide.tailgating.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="place-link"
                          >
                            Official {gameDayGuide.school} Game Day Information →
                          </a>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="tailgating-guide-heading">
                        <span className="section-kicker">
                          {openGameDaySection === "parkingArrival"
                            ? "PARKING & ARRIVAL"
                            : openGameDaySection === "knowBeforeYouGo"
                              ? "KNOW BEFORE YOU GO"
                              : "TRADITIONS"}
                        </span>
                        <h3 className="workspace-heading">
                          {openGameDaySection === "parkingArrival"
                            ? `Parking & Arrival at ${gameDayGuide.venueName || "the stadium"}`
                            : openGameDaySection === "knowBeforeYouGo"
                              ? `Know Before You Go: ${gameDayGuide.venueName || "the stadium"}`
                              : `${gameDayGuide.school || "Game Day"} Traditions`}
                        </h3>
                      </div>

                      {Array.isArray(
                        gameDayGuide[openGameDaySection]?.details
                      ) &&
                      gameDayGuide[openGameDaySection].details.length > 0 ? (
                        <div className="tailgating-guide-item">
                          <ul>
                            {gameDayGuide[openGameDaySection].details.map(
                              (item) => (
                                <li key={item}>{item}</li>
                              )
                            )}
                          </ul>
                        </div>
                      ) : (
                        <p className="section-copy">
                          {gameDayGuide[openGameDaySection]?.details ||
                            "Information is being added for this destination."}
                        </p>
                      )}

                      {gameDayGuide[openGameDaySection]?.sourceUrl ? (
                        <div className="tailgating-guide-source">
                          <a
                            href={gameDayGuide[openGameDaySection].sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="place-link"
                          >
                            Official {gameDayGuide.school} Information →
                          </a>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
            </GameDayScreen>

          <GameWeekendScreen active={activeScreen === "game-weekend"}>
          <div className="panel destination-panel">
            {weekendPlacesLoading ? (
              <p className="empty-state">
                Finding popular restaurants, bars, and hotels near the stadium...
              </p>
            ) : weekendPlacesError ? (
              <p className="error-state">{weekendPlacesError}</p>
            ) : (
              <>
  <PartnerPlacement
    contextLabel="Game Weekend"
    partner={workspacePartner}
  />

  <div className="game-weekend-grid">
                <div className="recommendation-column">
                  <h3 className="game-weekend-heading">🍴 Game Day Eats</h3>

                  {weekendPlaces.restaurant.length === 0 ? (
                    <p className="empty-state">
                      No nearby restaurants returned.
                    </p>
                  ) : (
                    <ul className="trip-list">
                      {weekendPlaces.restaurant.slice(0, showAllWeekend ? 6 : 3).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>

                            <span className="trip-route">
                              {place.rating
                                ? `${place.rating} ★`
                                : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>

                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}

                            <div className="recommendation-actions">
                              <button
                                type="button"
                                className={`ghost-button${
                                  isSuggestedStopAdded(place) ? " is-added" : ""
                                }`}
                                disabled={isSuggestedStopAdded(place)}
                                onClick={() =>
                                  addSuggestedStop(place, "restaurant")
                                }
                              >
                                {isSuggestedStopAdded(place)
                                  ? "✓ Saved"
                                  : "Save to Trip"}
                              </button>

                              {place.website ? (
                                <a
                                  className="place-link"
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Visit website
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="recommendation-column">
                  <h3 className="game-weekend-heading">🍺 Fan Bars</h3>

                  {weekendPlaces.bar.length === 0 ? (
                    <p className="empty-state">No nearby bars returned.</p>
                  ) : (
                    <ul className="trip-list">
                      {weekendPlaces.bar.slice(0, showAllWeekend ? 6 : 3).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>

                            <span className="trip-route">
                              {place.rating
                                ? `${place.rating} ★`
                                : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>

                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}

                            <div className="recommendation-actions">
                              <button
                                type="button"
                                className={`ghost-button${
                                  isSuggestedStopAdded(place) ? " is-added" : ""
                                }`}
                                disabled={isSuggestedStopAdded(place)}
                                onClick={() =>
                                  addSuggestedStop(place, "bar")
                                }
                              >
                                {isSuggestedStopAdded(place)
                                  ? "✓ Saved"
                                  : "Save to Trip"}
                              </button>

                              {place.website ? (
                                <a
                                  className="place-link"
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Visit website
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="recommendation-column">
                  <h3 className="game-weekend-heading">🛏 Stay Near the Stadium</h3>

                  {weekendPlaces.hotel.length === 0 ? (
                    <p className="empty-state">No nearby hotels returned.</p>
                  ) : (
                    <ul className="trip-list">
                      {weekendPlaces.hotel.slice(0, showAllWeekend ? 6 : 3).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>

                            <span className="trip-route">
                              {place.rating
                                ? `${place.rating} ★`
                                : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>

                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}

                            <div className="recommendation-actions">
                              <button
                                type="button"
                                className={`ghost-button${
                                  isSuggestedStopAdded(place) ? " is-added" : ""
                                }`}
                                disabled={isSuggestedStopAdded(place)}
                                onClick={() =>
                                  addSuggestedStop(place, "hotel")
                                }
                              >
                                {isSuggestedStopAdded(place)
                                  ? "✓ Saved"
                                  : "Save to Trip"}
                              </button>

                              {place.website ? (
                                <a
                                  className="place-link"
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Visit website
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(weekendPlaces.restaurant.length > 3 ||
                weekendPlaces.bar.length > 3 ||
                weekendPlaces.hotel.length > 3) ? (
                <div className="recommendation-expand-row">
                  <button
                    type="button"
                    className="recommendation-expand-button"
                    onClick={() => setShowAllWeekend((current) => !current)}
                  >
                    {showAllWeekend
                      ? "Show fewer game weekend options"
                      : "Show more game weekend options"}
                  </button>
                </div>
              ) : null}
              </>
            )}
          </div>
          </GameWeekendScreen>
          </>
        ) : null}

        {activeTrip && hasRoute && activeScreen === "drive" ? (
          <DriveScreen active>
            <DriveExperience
              alongTheWay={alongTheWay}
              apiBaseUrl={API_BASE_URL}
              currentDay={dayByDayPlan[0] || null}
              game={selectedFootballGame}
              onArrive={() => navigateTo("game-weekend")}
              onBack={() => navigateTo("trip-hq")}
              partner={workspacePartner}
              routeGeometry={routeGeometry}
              stops={stops}
              travelDayCount={travelDayCount}
              trip={activeTrip}
              tripStats={tripStats}
            />
          </DriveScreen>
        ) : null}

                

        {/* Preserved for later placement in the authenticated Trip HQ experience. */}
        <TripHqScreen active={false}>
        {auth ? (
        <div className="panel custom-trip-panel">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">OPTIONAL</span>
              <h2 className="panel-title">Create a Custom Trip</h2>
              <p className="section-copy">
                Planning something other than a football weekend? Build it here.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="trip-form">
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Trip name (optional)"
              className="trip-input"
            />

            <input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="Start (e.g., Seattle, WA)"
              className="trip-input"
            />

            <input
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="End (e.g., Houston, TX)"
              className="trip-input"
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="trip-input trip-notes"
              rows={3}
            />

            <button type="submit" className="primary-button">
              Add Trip
            </button>
          </form>
        </div>
        ) : null}


        </TripHqScreen>
        <footer className="site-footer">
        <section className="legal-section" aria-label="Kickoff Miles information">
          <details className="legal-card">
            <summary>About Kickoff Miles</summary>

            <div className="legal-content">
              <h2>About Kickoff Miles</h2>
              <p>
                Kickoff Miles is a college football road trip planning platform
                designed to help fans turn away games into memorable weekends.
              </p>
              <p>
                Choose your team, select a road game, build your route, and
                discover hotels, restaurants, bars, and places to stop along
                the way.
              </p>
              <p>
                <strong>Hit the Road. Chase the Game.</strong>
              </p>
              <p>
                Questions, feedback, or business inquiries can be sent to{" "}
                <a href="mailto:support@kickoffmiles.com">
                  support@kickoffmiles.com
                </a>
                .
              </p>
            </div>
          </details>

          <details className="legal-card">
            <summary>Privacy Policy</summary>

            <div className="legal-content">
              <h2>Privacy Policy</h2>
              <p className="legal-updated">Last updated: August 26, 2026</p>

              <h3>Information We Collect</h3>
              <p>
                Kickoff Miles may collect information you provide when creating
                an account, including your email address and information
                associated with trips you create or save. Saved trip information
                may include starting locations, destinations, selected games,
                route information, notes, stops, and favorites.
              </p>

              <h3>How We Use Information</h3>
              <p>
                We use information to provide and improve Kickoff Miles,
                maintain user accounts, save trip information, respond to
                support requests, and operate the website.
              </p>

              <h3>Third-Party Services</h3>
              <p>
                Kickoff Miles relies on third-party services to provide maps,
                routes, location information, college football schedules,
                hosting, database services, and related functionality.
              </p>

              <h3>Advertising and Affiliate Relationships</h3>
              <p>
                Kickoff Miles may in the future display advertising, sponsored
                listings, or affiliate links. This policy may be updated if
                those services are added.
              </p>

              <h3>Data Security</h3>
              <p>
                Reasonable measures are used to protect account and trip
                information, although no internet-based service can guarantee
                absolute security.
              </p>

              <h3>Contact</h3>
              <p>
                Privacy questions or requests may be sent to{" "}
                <a href="mailto:support@kickoffmiles.com">
                  support@kickoffmiles.com
                </a>
                .
              </p>
            </div>
          </details>

          <details className="legal-card">
            <summary>Terms of Use</summary>

            <div className="legal-content">
              <h2>Terms of Use</h2>
              <p className="legal-updated">Last updated: August 26, 2026</p>

              <h3>Use of Kickoff Miles</h3>
              <p>
                Kickoff Miles is a travel-planning and informational service.
                Users are responsible for their own transportation, lodging,
                dining, ticketing, and other travel decisions.
              </p>

              <h3>Information Accuracy</h3>
              <p>
                Routes, mileage, travel times, game schedules, venues, hotels,
                restaurants, ratings, prices, and availability may change.
                Kickoff Miles does not guarantee that third-party information
                will always be complete, current, or error-free.
              </p>

              <h3>College Football Schedules</h3>
              <p>
                Game dates, times, venues, opponents, and schedules may change.
                Verify important game information with the school, conference,
                venue, or another official source before traveling.
              </p>

              <h3>User Accounts</h3>
              <p>
                Users are responsible for maintaining the security of their
                account credentials and activity occurring through their
                accounts.
              </p>

              <h3>Third-Party Services</h3>
              <p>
                Third-party providers operate independently and may have their
                own terms, privacy policies, and conditions.
              </p>

              <h3>Service Availability</h3>
              <p>
                Kickoff Miles may modify, suspend, discontinue, or update
                features. Continuous or uninterrupted availability is not
                guaranteed.
              </p>

              <h3>Limitation of Liability</h3>
              <p>
                To the fullest extent permitted by law, Kickoff Miles is not
                responsible for losses or damages resulting from reliance on
                travel information, third-party information, service
                interruptions, delays, cancellations, accidents, or other
                circumstances arising from use of the service.
              </p>

              <h3>Contact</h3>
              <p>
                Questions regarding these terms may be sent to{" "}
                <a href="mailto:support@kickoffmiles.com">
                  support@kickoffmiles.com
                </a>
                .
              </p>
            </div>
          </details>
        </section>

          <div className="footer-brand">
            <strong>KICKOFF MILES</strong>
            <span>Hit the Road. Chase the Game.</span>
          </div>

          <div className="footer-links">
            <a href="mailto:support@kickoffmiles.com">
              support@kickoffmiles.com
            </a>
          </div>

          <p className="footer-copyright">
            © 2026 Kickoff Miles. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
