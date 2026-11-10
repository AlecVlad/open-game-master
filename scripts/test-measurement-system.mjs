import assert from "node:assert/strict";
import {
  formatFeet,
  formatMeasurementText,
  formatPounds,
} from "../src/lib/measurement-system.ts";

assert.equal(formatFeet(30, "si", "russian"), "9,1 м");
assert.equal(formatPounds(150, "si", "russian"), "68,04 кг");
assert.equal(formatMeasurementText("Movement 30 ft, reach 5 feet, carrying 150 lb.", "si", "russian"), "Movement 9,1 м, reach 1,5 м, carrying 68,04 кг.");
assert.equal(formatMeasurementText("Travel 2 miles at 40 mph.", "si", "english"), "Travel 3.2 km at 64 km/h.");
assert.equal(formatMeasurementText("Temperature 68°F; volume 1 gallon.", "si", "english"), "Temperature 20 °C; volume 3.79 L.");
assert.equal(formatMeasurementText("A 5-foot wall is 10 inches thick.", "si", "english"), "A 1.5 m wall is 25.4 cm thick.");
assert.equal(formatMeasurementText("A 1/2 mile walk.", "si", "english"), "A 0.8 km walk.");
assert.equal(formatMeasurementText("The road is 30-60 feet long.", "si", "english"), "The road is 9.1–18.3 m long.");
assert.equal(formatMeasurementText("30 ft, 150 lb", "imperial", "russian"), "30 ft, 150 lb");

console.log("measurement system tests passed");
