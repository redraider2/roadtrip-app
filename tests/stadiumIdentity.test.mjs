import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { getStadiumProfile, stadiumHeroCopy } from "../src/lib/stadiumIdentity.js";

test("Lubbock identity follows the host venue, never an unrelated or missing venue", () => {
  const profile = getStadiumProfile(3784);
  assert.equal(profile.stadium, "Galaxy Stadium");
  assert.equal(getStadiumProfile("3784.0"), profile);
  for (const venue of [null, undefined, "", "Texas Tech", 3947, "toString", "__proto__"]) {
    assert.equal(getStadiumProfile(venue), null);
  }
});

test("stadium photo is bundled with creator, source, license, history, and display changes", async () => {
  const { photo } = getStadiumProfile(3784);
  await access(new URL(`../public/${photo.path}`, import.meta.url));
  assert.equal(photo.creator, "Texas Tech University - University Student Housing");
  assert.equal(photo.license, "CC BY 2.0");
  assert.equal(new URL(photo.sourceUrl).hostname, "commons.wikimedia.org");
  assert.equal(new URL(photo.licenseUrl).hostname, "creativecommons.org");
  assert.match(photo.originalTitle, /2013/);
  assert.match(photo.changes, /cropped.*overlay/);
});

test("Game Weekend and Game Day retain different destination purposes", () => {
  const profile = getStadiumProfile(3784);
  const weekend = stadiumHeroCopy(profile, "game-weekend");
  const day = stadiumHeroCopy(profile, "game-day");
  assert.match(weekend.eyebrow, /^Game Weekend/);
  assert.match(day.eyebrow, /^Game Day/);
  assert.notEqual(day.title, weekend.title);
});
