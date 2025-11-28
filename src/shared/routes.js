import { ROUTES } from "../config/routes.js";

export function normalizePath(pathname = "") {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function matchRoute(pathname = "") {
  const normalized = normalizePath(pathname);
  return ROUTES.find((route) => route.path === normalized) || null;
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
