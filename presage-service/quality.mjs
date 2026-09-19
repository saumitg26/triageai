// Technical readiness for this prototype, not a clinically validated accuracy threshold.
export function usableReading(sample, validation, now) {
  return Boolean(sample && validation === 0 && sample.stable === true &&
    Number.isFinite(sample.value) && sample.value > 0 &&
    Number.isFinite(sample.confidence) && sample.confidence > 0 &&
    now - sample.receivedAt >= 0 && now - sample.receivedAt <= 5000);
}
