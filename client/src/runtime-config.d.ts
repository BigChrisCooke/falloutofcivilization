export {};

declare global {
  interface Window {
    __FOC_RUNTIME_CONFIG__?: {
      apiBaseUrl?: string;
      appRelease?: string;
    };
  }
}
