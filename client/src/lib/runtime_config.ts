export interface RuntimeConfig {
  apiBaseUrl?: string;
  appRelease?: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__FOC_RUNTIME_CONFIG__ ?? {};
}

export function getApiBaseUrl(): string {
  return (getRuntimeConfig().apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/u, "");
}

export function getAppRelease(): string {
  return getRuntimeConfig().appRelease ?? "";
}
