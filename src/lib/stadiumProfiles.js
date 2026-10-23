import profiles from "../data/stadiumProfiles.json" with { type: "json" };

export function getStadiumProfile(venueId) {
  if (venueId === null || venueId === undefined || venueId === "") return null;
  const key = String(venueId).trim();
  const normalized = /^\d+(?:\.0+)?$/.test(key) ? String(Number(key)) : key;
  return profiles[normalized] || null;
}

export function stadiumFeatureCopy(profile, variant = "plan") {
  const identity = `${profile.school} / ${profile.city}, ${profile.state}`;
  const isLubbock = profile.venueId === "3784";
  if (variant === "day") return {
    eyebrow: `Game Day / ${identity}`,
    title: "This is what\nthe miles are for.",
    intro: "Your game. Your people. Your stadium. Enjoy every minute.",
    sign: "KICKOFF AHEAD ↗",
  };
  if (variant === "weekend") return {
    eyebrow: `Game Weekend / ${identity}`,
    title: isLubbock ? "Welcome to\nRaiderland." : `Welcome to ${profile.city}.`,
    intro: isLubbock
      ? "West Texas skies. Scarlet and black. A weekend to make your own."
      : "The game brings you here. Make the whole weekend your own.",
    sign: "NEXT STOP ↗",
  };
  return {
    eyebrow: identity,
    title: isLubbock ? "Your road leads\nto Raiderland." : `Your road leads to ${profile.city}.`,
    intro: "The drive is part of the story. This is the destination.",
    sign: "YOUR DESTINATION ↗",
  };
}
