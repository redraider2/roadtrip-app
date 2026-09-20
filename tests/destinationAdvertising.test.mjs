import test from "node:test";
import assert from "node:assert/strict";

import {
  partnerMatchesDestination,
  selectDestinationDemoPartner,
} from "../src/lib/destinationAdvertising.js";

const partners = {
  spankys: {
    id: "demo-spankys",
    destinationVenueIds: ["3784"],
  },
  other: {
    id: "demo-other",
    destinationVenueIds: ["9999"],
  },
};

test("destination partner matches only an eligible venue", () => {
  assert.equal(partnerMatchesDestination(partners.spankys, "3784"), true);
  assert.equal(partnerMatchesDestination(partners.spankys, 3784), true);
  assert.equal(partnerMatchesDestination(partners.spankys, "9999"), false);
  assert.equal(partnerMatchesDestination(partners.spankys, null), false);
});

test("demo selection does not leak an advertiser into another destination", () => {
  assert.equal(
    selectDestinationDemoPartner({
      demoKey: "spankys",
      partners,
      venueId: "9999",
    }),
    null
  );

  assert.equal(
    selectDestinationDemoPartner({
      demoKey: "spankys",
      partners,
      venueId: "3784",
    })?.id,
    "demo-spankys"
  );
});

test("destination targeting supports independent advertiser pools", () => {
  assert.equal(
    selectDestinationDemoPartner({
      demoKey: "other",
      partners,
      venueId: "9999",
    })?.id,
    "demo-other"
  );
  assert.equal(
    selectDestinationDemoPartner({
      demoKey: "other",
      partners,
      venueId: "3784",
    }),
    null
  );
});
