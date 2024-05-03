export const CustomBrowserContextOptions = {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  isMobile: false,
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  colorScheme: 'dark'
};

export type EnvironmentUserCreds = {
  CLI_PROGAME_USERNAME: string | undefined;
  CLI_PROGAME_EMAIL: string | undefined;
  CLI_PROGAME_PW: string | undefined;
};

export type ConstructedBuildings = {
  metallmine: string;
  solarkraftwerk: string;
  kristallmine: string;
  deuteriumsynthetisierer: string;
  roboterfabrik: string;
  raumschiffwerft: string;
  forschungslabor: string;
  metallspeicher: string;
  kristallspeicher: string;
  deuteriumtank: string;
  [key: string]: string;
};

export type Resources = {
  metAvailable: number;
  krisAvailable: number;
  deutAvailable: number;
  energyAvailable: number;
};

export type ResourcesHourly = {
  metProduced: number;
  krisProduced: number;
  deutProduced: number;
};

export type ResourceWaitTime = {
  timeForMet: number;
  timeForKris: number;
  timeForDeut: number;
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

export type BaseCost = {
  met: number;
  kris: number;
  deut: number;
};
export type Research = BaseConstruct & {
  cost: BaseCost;
  minResearchlabLevel: number;
};

export type Building = BaseConstruct & {
  researchOverride: boolean;
  cost: BaseCost & {
    energy: number;
    energyProduction?: number;
    totalEnergyProduction?: number;
    totalEnergyConsumption?: number;
  };
};

export type Ship = BaseConstruct & {
  cost: BaseCost;
};
export type Defense = BaseConstruct & {
  cost: BaseCost;
};
