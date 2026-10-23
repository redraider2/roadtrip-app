import { stadiumProfiles } from "../data/stadiumProfiles.js";

export function getStadiumProfile(venueId) {
  if (venueId === null || venueId === undefined || venueId === "") return null;
  const key = String(venueId).trim();
  // Some tracker imports serialize numeric venue IDs as "3784.0".
  const normalized = /^\d+(?:\.0+)?$/.test(key) ? String(Number(key)) : key;
  return Object.hasOwn(stadiumProfiles, normalized) ? stadiumProfiles[normalized] : null;
}

export function stadiumHeroCopy(profile, screen) {
  const identity = `${profile.school} / ${profile.city}, ${profile.state}`;
  if (screen === "game-day") return {
    eyebrow: `Game Day / ${identity}`,
    title: "This is what the miles are for.",
    description: "Your game. Your people. Your stadium. Keep the essentials close and enjoy every minute.",
    signLabel: "Kickoff ahead",
  };
  if (screen === "game-weekend" || screen === "destinations") return {
    eyebrow: `Game Weekend / ${identity}`,
    title: profile.welcomeTitle,
    description: profile.welcomeDescription,
    signLabel: "Next stop",
  };
  return {
    eyebrow: `Your road trip headquarters / ${identity}`,
    title: profile.headquartersTitle,
    description: "The stadium is the destination. The whole weekend is the adventure.",
    signLabel: "Game weekend",
  };
}
