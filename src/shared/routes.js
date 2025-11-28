import { ROUTES } from "../config/routes.js";

export function normalizePath(pathname = "") {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function doesRoutePathMatch(routePath, normalized) {
  if (!routePath) {
    return false;
  }
  const normalizedRoute = normalizePath(routePath);
  if (!normalizedRoute.includes("*")) {
    return normalizedRoute === normalized;
  }
  const escaped = normalizedRoute.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  const pattern = escaped.replace(/\*/g, "[^/]+");
  const matcher = new RegExp(`^${pattern}$`);
  return matcher.test(normalized);
}

export function matchRoute(pathname = "") {
  const normalized = normalizePath(pathname);
  return (
    ROUTES.find((route) => {
      const paths = [route.path, ...(route.altPaths || [])].filter(Boolean);
      return paths.some((routePath) => doesRoutePathMatch(routePath, normalized));
    }) || null
  );
}

export function buildRoutePayload(urlString) {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString);
    const pathname = normalizePath(url.pathname);
    const route = matchRoute(pathname);
    return {
      url: urlString,
      origin: url.origin,
      pathname,
      route,
    };
  } catch (error) {
    console.error("Failed to parse URL for route payload", error);
    return null;
  }
}
