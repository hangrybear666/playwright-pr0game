export const CustomBrowserContextOptions = {
  headless: false,
  viewport: { width: 1366, height: 768 },
  // viewport: { width: 1920, height: 1080 },
  isMobile: false,
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  colorScheme: 'dark'
};

type BaseConstruct = {
  constructionType: string;
  order: number;
  name: string;
  level: number;
  cost: {
    met: number;
    kris: number;
    deut: number;
  };
  hasBeenQueued: boolean;
  queuedAt: Date | null;
};

type BaseCost = {
  met: number;
  kris: number;
  deut: number;
};
export type Research = BaseConstruct & {
  cost: BaseCost;
  minResearchlabLevel: number;
};

export type Building = BaseConstruct & {
  cost: BaseCost & {
    energy: number;
    energyProduction?: number;
    totalEnergyProduction?: number;
    totalEnergyConsumption?: number;
  };
};

export type Ships = BaseConstruct & {
  cost: BaseCost;
};
export type Defense = BaseConstruct & {
  cost: BaseCost;
};
