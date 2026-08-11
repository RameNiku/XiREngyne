# XiR Engine

First playable web prototype for the XiR tower-defense roguelike.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run build
```

The static production build is generated in `dist/`.

## Current Prototype

- Main menu using the provided sketch background.
- PixiJS renderer with a large `200x100` tile map.
- Camera movement with `WASD` / arrow keys.
- Mouse wheel zoom.
- Shop panel with three starter tower types.
- Grid-based building with visibility rules.
- Flow-field enemy pathing toward the `3x3` core.
- Wave spawning, kills, metal rewards, and basic XiR rewards every tenth wave.
- Tower targeting via spatial hashing instead of scanning the whole map blindly.
- Simple projectile, area damage, and pusher behavior.

## Deployment

The project is prepared for static hosting. The included GitHub Pages workflow builds the game with Vite and publishes `dist/`.
