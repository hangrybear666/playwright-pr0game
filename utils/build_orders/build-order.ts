import { Building } from '../customTypes';
import { RESEARCH_ORDER } from './research-order';

function MetallmineCost(level: number) {
  return {
    met: Math.round(40 * Math.pow(1.5, level)),
    kris: Math.round(10 * Math.pow(1.5, level)),
    deut: 0,
    energy: Math.round(10 * level * Math.pow(1.1, level)) - Math.round(10 * (level - 1) * Math.pow(1.1, level - 1)),
    totalEnergyConsumption: Math.round(10 * level * Math.pow(1.1, level))
  };
}
function SolarkraftwerkCost(level: number) {
  return {
    met: Math.round(50 * Math.pow(1.5, level)),
    kris: Math.round(20 * Math.pow(1.5, level)),
    deut: 0,
    energy: 0,
    energyProduction: Math.round(20 * level * Math.pow(1.1, level)) - Math.round(20 * (level - 1) * Math.pow(1.1, level - 1)),
    totalEnergyProduction: Math.round(20 * level * Math.pow(1.1, level))
  };
}
function KristallmineCost(level: number) {
  return {
    met: Math.round(30 * Math.pow(1.6, level)),
    kris: Math.round(15 * Math.pow(1.6, level)),
    deut: 0,
    energy: Math.round(10 * level * Math.pow(1.1, level)) - Math.round(10 * (level - 1) * Math.pow(1.1, level - 1)),
    totalEnergyConsumption: Math.round(10 * level * Math.pow(1.1, level))
  };
}

function DeuteriumsynthetisiererCost(level: number) {
  return {
    met: Math.round(150 * Math.pow(1.5, level)),
    kris: Math.round(50 * Math.pow(1.5, level)),
    deut: 0,
    energy: Math.round(20 * level * Math.pow(1.1, level)) - Math.round(20 * (level - 1) * Math.pow(1.1, level - 1)),
    totalEnergyConsumption: Math.round(20 * level * Math.pow(1.1, level))
  };
}
function RoboterfabrikCost(level: number) {
  return {
    met: Math.floor(200 * Math.pow(2.0, level)),
    kris: Math.floor(60 * Math.pow(2.0, level)),
    deut: Math.floor(100 * Math.pow(2.0, level)),
    energy: 0
  };
}

function ForschungslaborCost(level: number) {
  return {
    met: Math.floor(100 * Math.pow(2.0, level)),
    kris: Math.floor(200 * Math.pow(2.0, level)),
    deut: Math.floor(100 * Math.pow(2.0, level)),
    energy: 0
  };
}
function RaumschiffwerftCost(level: number) {
  return {
    met: Math.floor(200 * Math.pow(2.0, level)),
    kris: Math.floor(100 * Math.pow(2.0, level)),
    deut: Math.floor(50 * Math.pow(2.0, level)),
    energy: 0
  };
}
function MetallspeicherCost(level: number) {
  return {
    met: 1000 * Math.pow(2.0, level),
    kris: 0,
    deut: 0,
    energy: 0
  };
}
function KristallspeicherCost(level: number) {
  return {
    met: 1000 * Math.pow(2.0, level),
    kris: 500 * Math.pow(2.0, level),
    deut: 0,
    energy: 0
  };
}
function DeuteriumtankCost(level: number) {
  return {
    met: 1000 * Math.pow(2.0, level),
    kris: 1000 * Math.pow(2.0, level),
    deut: 0,
    energy: 0
  };
}
// switch to research tab and wait for resource accumulation in between builds
function ResearchOverride(index: number) {
  return {
    name: RESEARCH_ORDER[index].name,
    researchOverride: true,
    level: RESEARCH_ORDER[index].level,
    cost: {
      met: 0,
      kris: 0,
      deut: 0,
      energy: 0
    },
    constructionType: 'research'
  };
}
// Solarkraftwerk Kristallmine Deuteriumsynthetisierer Fusionskraftwerk Roboterfabrik Raumschiffwerft Metallspeicher Kristallspeicher Deuteriumtank Forschungslabor
export const BUILD_ORDER: Building[] = [
  {
    name: 'Solarkraftwerk',
    level: 1,
    cost: SolarkraftwerkCost(1),
    hasBeenQueued: true,
    queuedAt: new Date(),
    researchOverride: false
  },
  {
    name: 'Metallmine',
    level: 1,
    cost: MetallmineCost(1)
  },
  {
    name: 'Metallmine',
    level: 2,
    cost: MetallmineCost(2)
  },
  {
    name: 'Solarkraftwerk',
    level: 2,
    cost: SolarkraftwerkCost(2)
  },
  {
    name: 'Metallmine',
    level: 3,
    cost: MetallmineCost(3)
  },
  {
    name: 'Metallmine',
    level: 4,
    cost: MetallmineCost(4)
  },
  {
    name: 'Solarkraftwerk',
    level: 3,
    cost: SolarkraftwerkCost(3)
  },
  {
    name: 'Kristallmine',
    level: 1,
    cost: KristallmineCost(1)
  },
  {
    name: 'Solarkraftwerk',
    level: 4,
    cost: SolarkraftwerkCost(4)
  },
  {
    name: 'Metallmine',
    level: 5,
    cost: MetallmineCost(5)
  },
  {
    name: 'Kristallmine',
    level: 2,
    cost: KristallmineCost(2)
  },
  {
    name: 'Kristallmine',
    level: 3,
    cost: KristallmineCost(3)
  },
  {
    name: 'Solarkraftwerk',
    level: 5,
    cost: SolarkraftwerkCost(5)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 1,
    cost: DeuteriumsynthetisiererCost(1)
  },
  {
    name: 'Kristallmine',
    level: 4,
    cost: KristallmineCost(4)
  },
  {
    name: 'Solarkraftwerk',
    level: 6,
    cost: SolarkraftwerkCost(6)
  },
  {
    name: 'Metallmine',
    level: 6,
    cost: MetallmineCost(6)
  },
  {
    name: 'Metallmine',
    level: 7,
    cost: MetallmineCost(7)
  },
  {
    name: 'Solarkraftwerk',
    level: 7,
    cost: SolarkraftwerkCost(7)
  },
  {
    name: 'Kristallmine',
    level: 5,
    cost: KristallmineCost(5)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 2,
    cost: DeuteriumsynthetisiererCost(2)
  },
  {
    name: 'Solarkraftwerk',
    level: 8,
    cost: SolarkraftwerkCost(8)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 3,
    cost: DeuteriumsynthetisiererCost(3)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 4,
    cost: DeuteriumsynthetisiererCost(4)
  },
  {
    name: 'Solarkraftwerk',
    level: 9,
    cost: SolarkraftwerkCost(9)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 5,
    cost: DeuteriumsynthetisiererCost(5)
  },
  {
    name: 'Roboterfabrik',
    level: 1,
    cost: RoboterfabrikCost(1)
  },
  {
    name: 'Roboterfabrik',
    level: 2,
    cost: RoboterfabrikCost(2)
  },
  {
    name: 'Forschungslabor',
    level: 1,
    cost: ForschungslaborCost(1)
  },
  {
    ...ResearchOverride(0)
  },
  {
    ...ResearchOverride(1)
  },
  {
    name: 'Raumschiffwerft',
    level: 1,
    cost: RaumschiffwerftCost(1)
  },
  {
    name: 'Kristallmine',
    level: 6,
    cost: KristallmineCost(6)
  },
  {
    name: 'Raumschiffwerft',
    level: 2,
    cost: RaumschiffwerftCost(2)
  },
  {
    name: 'Solarkraftwerk',
    level: 10,
    cost: SolarkraftwerkCost(10)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 6,
    cost: DeuteriumsynthetisiererCost(6)
  },
  {
    name: 'Metallmine',
    level: 8,
    cost: MetallmineCost(8)
  },
  {
    name: 'Solarkraftwerk',
    level: 11,
    cost: SolarkraftwerkCost(11)
  },
  {
    name: 'Kristallmine',
    level: 7,
    cost: KristallmineCost(7)
  },
  {
    name: 'Metallmine',
    level: 9,
    cost: MetallmineCost(9)
  },
  {
    name: 'Metallmine',
    level: 10,
    cost: MetallmineCost(10)
  },
  {
    name: 'Solarkraftwerk',
    level: 12,
    cost: SolarkraftwerkCost(12)
  },
  {
    name: 'Kristallmine',
    level: 8,
    cost: KristallmineCost(8)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 7,
    cost: DeuteriumsynthetisiererCost(7)
  },
  {
    name: 'Solarkraftwerk',
    level: 13,
    cost: SolarkraftwerkCost(13)
  },
  {
    name: 'Metallmine',
    level: 11,
    cost: MetallmineCost(11)
  },
  {
    name: 'Kristallmine',
    level: 9,
    cost: KristallmineCost(9)
  },
  {
    name: 'Metallspeicher',
    level: 1,
    cost: MetallspeicherCost(1)
  },
  {
    name: 'Kristallspeicher',
    level: 1,
    cost: KristallspeicherCost(1)
  },
  {
    name: 'Deuteriumtank',
    level: 1,
    cost: DeuteriumtankCost(1)
  },
  {
    name: 'Forschungslabor',
    level: 2,
    cost: ForschungslaborCost(1)
  },
  {
    ...ResearchOverride(2)
  },
  {
    name: 'Solarkraftwerk',
    level: 14,
    cost: SolarkraftwerkCost(14)
  },
  {
    name: 'Metallmine',
    level: 12,
    cost: MetallmineCost(12)
  },
  {
    name: 'Kristallmine',
    level: 10,
    cost: KristallmineCost(10)
  },
  {
    ...ResearchOverride(3)
  },
  {
    name: 'Deuteriumsynthetisierer',
    level: 8,
    cost: DeuteriumsynthetisiererCost(8)
  },
  {
    name: 'Metallspeicher',
    level: 2,
    cost: MetallspeicherCost(2)
  },
  {
    name: 'Kristallspeicher',
    level: 2,
    cost: KristallspeicherCost(2)
  },
  {
    ...ResearchOverride(4)
  },
  {
    name: 'Forschungslabor',
    level: 2,
    cost: ForschungslaborCost(1)
  },
  {
    ...ResearchOverride(5)
  },
  {
    ...ResearchOverride(6)
  },
  {
    ...ResearchOverride(7)
  }
].map((building, index) => ({
  order: index, // build order starting at 0 from array index
  ...building, // explicitly defined building variables
  hasBeenQueued: building.hasBeenQueued ? building.hasBeenQueued : false, // defaults to false unless provided in object explicitly
  queuedAt: building.queuedAt ? building.queuedAt : null, // defaults to null unless provided in object explicitly
  constructionType: building.researchOverride ? 'research' : 'building',
  researchOverride: building.researchOverride ? true : false
}));
