import { Research } from '../customTypes';

// Forschungslabor (Stufe 0/3)
function Spionagetechnik(level: number) {
  return {
    name: 'Spionagetechnik',
    level: level,
    cost: {
      met: 100 * Math.pow(2, level),
      kris: 500 * Math.pow(2, level),
      deut: 100 * Math.pow(2, level)
    },
    minResearchlabLevel: 3
  };
}

// Forschungslabor (Stufe 0/1)
function Computertechnik(level: number) {
  return {
    name: 'Computertechnik',
    level: level,
    cost: {
      met: 0,
      kris: 200 * Math.pow(2, level),
      deut: 300 * Math.pow(2, level)
    },
    minResearchlabLevel: 1
  };
}

// Forschungslabor (Stufe 0/4)
// function Waffentechnik(level: number) {
//   return {
//     name: 'Waffentechnik',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Energietechnik (Stufe 0/3)
// Forschungslabor (Stufe 0/6)
// function Schildtechnik(level: number) {
//   return {
//     name: 'Schildtechnik',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/2)
// function Raumschiffpanzerung(level: number) {
//   return {
//     name: 'Raumschiffpanzerung',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/1)
function Energietechnik(level: number) {
  return {
    name: 'Energietechnik',
    level: level,
    cost: {
      met: 0,
      kris: 400 * Math.pow(2, level),
      deut: 200 * Math.pow(2, level)
    },
    minResearchlabLevel: 1
  };
}

// Energietechnik (Stufe 0/5)
// Schildtechnik (Stufe 0/5)
// Forschungslabor (Stufe 0/7)
// function Hyperraumtechnik(level: number) {
//   return {
//     name: 'Hyperraumtechnik',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Energietechnik (Stufe 0/1)
// Forschungslabor (Stufe 0/1)
function Verbrennungstriebwerk(level: number) {
  return {
    name: 'Verbrennungstriebwerk',
    level: level,
    cost: {
      met: 200 * Math.pow(2, level),
      kris: 0,
      deut: 300 * Math.pow(2, level)
    },
    minResearchlabLevel: 1
  };
}

// Energietechnik (Stufe 0/1)
// Forschungslabor (Stufe 0/2)
function Impulstriebwerk(level: number) {
  return {
    name: 'Impulstriebwerk',
    level: level,
    cost: {
      met: 1000 * Math.pow(2, level),
      kris: 2000 * Math.pow(2, level),
      deut: 300 * Math.pow(2, level)
    },
    minResearchlabLevel: 2
  };
}

// Hyperraumtechnik (Stufe 0/3)
// Forschungslabor (Stufe 0/7)
// function Hyperraumantrieb(level: number) {
//   return {
//     name: 'Hyperraumantrieb',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/1)
// Energietechnik (Stufe 0/2)
// function Lasertechnik(level: number) {
//   return {
//     name: 'Lasertechnik',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/4)
// Lasertechnik (Stufe 0/5)
// Energietechnik (Stufe 0/4)
// function Ionentechnik(level: number) {
//   return {
//     name: 'Ionentechnik',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/5)
// Energietechnik (Stufe 0/8)
// Lasertechnik (Stufe 0/10)
// Ionentechnik (Stufe 0/5)
// function Plasmatechnik(level: number) {
//   return {
//     name: 'Plasmatechnik',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/10)
// Computertechnik (Stufe 0/8)
// Hyperraumtechnik (Stufe 0/8)
// function IntergalaktischesForschungsnetzwerk(level: number) {
//   return {
//     name: 'IntergalaktischesForschungsnetzwerk',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Spionagetechnik (Stufe 0/3)
// Impulstriebwerk (Stufe 0/3)
// Forschungslabor (Stufe 0/3)
function Astrophysik(level: number) {
  return {
    name: 'Astrophysik',
    level: level,
    cost: {
      met: 100 * (0.5 + Math.round(40 * Math.pow(1.75, level - 1))),
      kris: 100 * (0.5 + Math.round(80 * Math.pow(1.75, level - 1))),
      deut: 100 * (0.5 + Math.round(40 * Math.pow(1.75, level - 1))),
      energy: 0
    },
    minResearchlabLevel: 3
  };
}

// Forschungslabor (Stufe 0/4)
// Energietechnik (Stufe 0/3)
// function ProduktionsmaximierungMetall(level: number) {
//   return {
//     name: 'ProduktionsmaximierungMetall',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/4)
// Energietechnik (Stufe 0/3)
// function ProduktionsmaximierungKristall(level: number) {
//   return {
//     name: 'ProduktionsmaximierungKristall',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/4)
// Energietechnik (Stufe 0/3)
// function ProduktionsmaximierungDeuterium(level: number) {
//   return {
//     name: 'ProduktionsmaximierungDeuterium',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

// Forschungslabor (Stufe 0/12)
// function Gravitonforschung(level: number) {
//   return {
//     name: 'Gravitonforschung',
//     level: level,
//     cost: {
//       met: 0,
//       kris: 0,
//       deut: 0
//     }
//   };
// }

export const RESEARCH_ORDER: Research[] = [
  // Forschungslabor (Stufe 1/1)
  Computertechnik(1),
  Energietechnik(1),
  // Forschungslabor (Stufe 2/2)
  Impulstriebwerk(1),
  Impulstriebwerk(2),
  // Forschungslabor (Stufe 3/3)
  Spionagetechnik(1),
  Spionagetechnik(2),
  Spionagetechnik(3),
  Spionagetechnik(4),
  Verbrennungstriebwerk(1),
  Verbrennungstriebwerk(2),
  Verbrennungstriebwerk(3),
  Verbrennungstriebwerk(4),
  Spionagetechnik(5),
  Verbrennungstriebwerk(5),
  Spionagetechnik(6),
  Impulstriebwerk(3),
  Energietechnik(2),
  Verbrennungstriebwerk(6),
  Energietechnik(3),
  Astrophysik(1),
  Astrophysik(2),
  Astrophysik(3)
].map((research, index) => ({
  order: index, // build order starting at 0 from array index
  ...research, // explicitly defined building variables
  hasBeenQueued: false, // defaults to false unless provided in object explicitly
  queuedAt: null, // defaults to null unless provided in object explicitly
  constructionType: 'research'
}));
