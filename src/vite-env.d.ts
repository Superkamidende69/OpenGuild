/// <reference types="vite/client" />

interface Window {
  openGuild?: {
    getVersion: () => Promise<string>;
    getApiBaseUrl: () => Promise<string>;
  };
}
