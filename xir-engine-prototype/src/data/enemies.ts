export type EnemyDefinition = {
  kind: string;
  name: string;
  health: number;
  speed: number;
  metal: number;
  color: number;
};

export const ENEMIES: EnemyDefinition[] = [
  {
    kind: "wu1r",
    name: "Wu1R",
    health: 15,
    speed: 2.8,
    metal: 2,
    color: 0xf0f0f0
  },
  {
    kind: "wu9ke",
    name: "Wu9ke",
    health: 40,
    speed: 1.8,
    metal: 5,
    color: 0xd0d0d0
  },
  {
    kind: "sh-ar3",
    name: "Sh-AR3",
    health: 20,
    speed: 3.6,
    metal: 3,
    color: 0xffffff
  }
];
