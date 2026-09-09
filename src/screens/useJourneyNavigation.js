import { useCallback, useEffect, useState } from "react";

import { getJourneyHash, parseJourneyHash } from "./journeyArchitecture.js";

function readActiveScreen() {
  return typeof window === "undefined"
    ? "home"
    : parseJourneyHash(window.location.hash);
}

export function useJourneyNavigation() {
  const [activeScreen, setActiveScreen] = useState(readActiveScreen);

  useEffect(() => {
    const handlePopState = () => setActiveScreen(readActiveScreen());
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((screenId) => {
    const nextHash = getJourneyHash(screenId);

    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }

    setActiveScreen(parseJourneyHash(nextHash));
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { activeScreen, navigateTo };
}
