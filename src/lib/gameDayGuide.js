const STATUS_PLACEHOLDER = /^(complete|completed|done|ready for qa|tbd|pending|n\/?a)$/i;

export function guideLines(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : [];
  return values.filter(item => typeof item === 'string').map(item => item.trim())
    .filter(item => item && !STATUS_PLACEHOLDER.test(item));
}

export function normalizeGameDayGuide(guide) {
  if (!guide || typeof guide !== 'object') return null;
  const tailgating = { ...guide.tailgating };
  for (const key of ['where', 'arrival', 'rules', 'visitors']) tailgating[key] = guideLines(tailgating[key]);
  const result = { ...guide, tailgating };
  for (const key of ['parkingArrival', 'knowBeforeYouGo', 'traditions']) {
    result[key] = { ...guide[key], details: guideLines(guide[key]?.details) };
  }
  return result;
}
