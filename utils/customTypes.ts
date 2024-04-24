export const CustomBrowserContextOptions = {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  isMobile: false,
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  colorScheme: 'dark'
};

export type Building = {
  order: number;
  name: string;
  level: number;
  cost: {
    met: number;
    kris: number;
    deut: number;
    energy: number | null;
    energyProduction?: number;
    totalEnergyProduction?: number;
    totalEnergyConsumption?: number;
  };
  hasBeenQueued: boolean;
  queuedAt: Date | null;
};
