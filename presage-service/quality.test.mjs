import test from 'node:test';
import assert from 'node:assert/strict';
import { usableReading } from './quality.mjs';
const reading = { value: 72, confidence: 0.9, stable: true, receivedAt: 1000 };
test('fresh stable samples require passing validation', () => {
  assert.equal(usableReading(reading, 0, 2000), true);
  for (const validation of [null, 1, 7, 12]) assert.equal(usableReading(reading, validation, 2000), false);
});
test('missing, stale, unstable and unmeasured readings cannot autofill', () => {
  assert.equal(usableReading(null, 0, 2000), false);
  assert.equal(usableReading(reading, 0, 7000), false);
  for (const patch of [{stable:false}, {confidence:0}, {value:NaN}, {value:0}, {receivedAt:3000}]) assert.equal(usableReading({...reading,...patch}, 0, 2000), false);
});
