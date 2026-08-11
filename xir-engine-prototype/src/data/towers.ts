export type TowerKind = "regular" | "area" | "pusher";

export type TowerDefinition = {
  kind: TowerKind;
  name: string;
  asset: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number;
  projectileSpeed: number;
  areaRadius?: number;
  pushCells?: number;
};

export const TOWERS: TowerDefinition[] = [
  {
    kind: "regular",
    name: "Trt0-10",
    asset: "assets/tower-regular.jpg",
    cost: 20,
    damage: 1,
    range: 12,
    cooldown: 0.34,
    projectileSpeed: 660
  },
  {
    kind: "area",
    name: "Be-CON-1",
    asset: "assets/tower-area.jpg",
    cost: 45,
    damage: 3,
    range: 15,
    cooldown: 1.1,
    projectileSpeed: 440,
    areaRadius: 2.4
  },
  {
    kind: "pusher",
    name: "TU.H1",
    asset: "assets/tower-pusher.jpg",
    cost: 80,
    damage: 10,
    range: 12,
    cooldown: 1.35,
    projectileSpeed: 420,
    pushCells: 5
  }
];
