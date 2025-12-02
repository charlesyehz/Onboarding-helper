export const ALLOWED_ORIGINS = [
  { protocol: "http:", hostname: "localhost" },
  { protocol: "https:", hostname: "dashboard.myzeller.dev" },
];

function matchesAllowedOrigin(protocol, hostname) {
  if (!protocol || !hostname) {
    return false;
  }
  const normalizedProtocol = protocol.toLowerCase();
  const normalizedHost = hostname.toLowerCase();
  return ALLOWED_ORIGINS.some(
    (origin) =>
      origin.protocol === normalizedProtocol &&
      origin.hostname === normalizedHost
  );
}

export function isAllowedOrigin(originString = "") {
  if (!originString) {
    return false;
  }
  try {
    const parsed = new URL(originString);
    return matchesAllowedOrigin(parsed.protocol, parsed.hostname);
  } catch (error) {
    console.warn("[Allowed Origins] Failed to parse origin", originString, error);
    return false;
  }
}

export function isAllowedUrl(urlString = "") {
  if (!urlString) {
    return false;
  }
  try {
    const parsed = new URL(urlString);
    return matchesAllowedOrigin(parsed.protocol, parsed.hostname);
  } catch (error) {
    console.warn("[Allowed Origins] Failed to parse URL", urlString, error);
    return false;
  }
}

export function isAllowedLocation(locationLike) {
  if (!locationLike) {
    return false;
  }
  const { protocol, hostname } = locationLike;
  return matchesAllowedOrigin(protocol, hostname);
}
