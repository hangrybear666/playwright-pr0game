//  _____   _____   _____   _   _  ______
// /  ___| |  ___| |_   _| | | | | | ___ \
// \ `--.  | |__     | |   | | | | | |_/ /
//  `--. \ |  __|    | |   | | | | |  __/
// /\__/ / | |___    | |   | |_| | | |
// \____/  \____/    \_/    \___/  \_|

export const CustomBrowserContextOptions = {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  isMobile: false,
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  colorScheme: 'dark'
};

//  _____   _   _   _____   _   _   _____
// |  _  | | | | | |  ___| | | | | |  ___|
// | | | | | | | | | |__   | | | | | |__
// | | | | | | | | |  __|  | | | | |  __|
// \ \/' / | |_| | | |___  | |_| | | |___
//  \_/\_\  \___/  \____/   \___/  \____/

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

// _____   _____    ___    _____   _____
// /  ___| |_   _|  / _ \  |_   _| /  ___|
// \ `--.    | |   / /_\ \   | |   \ `--.
//  `--. \   | |   |  _  |   | |    `--. \
// /\__/ /   | |   | | | |   | |   /\__/ /
// \____/    \_/   \_| |_/   \_/   \____/

export type PlayerStatistics = {
  name: string;
  rank: number;
  buildingsRank: number;
  researchRank: number;
  fleetRank: number;
  defenseRank: number;
  total: number;
  buildings: number;
  research: number;
  fleet: number;
  defense: number;
  serverDate: string;
  checkDate: Date;
};

// export type PlayerStatistics = {
//   serverDate: Date;
//   checkDate: Date;
//   children: {
//     name: string;
//     rank: number;
//     buildingsRank: number;
//     researchRank: number;
//     fleetRank: number;
//     defenseRank: number;
//     total: number;
//     buildings: number;
//     research: number;
//     fleet: number;
//     defense: number;
//   };
// };

export enum PointTypeEnum {
  total = '1',
  research = '3',
  buildings = '4'
}

export type PointType = 'total' | 'buildings' | 'research' | 'fleet' | 'defense';
