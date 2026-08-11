import { Application, Assets, Texture } from "pixi.js";
import "./style.css";
import { TowerKind } from "./data/towers";
import { MAX_DT } from "./game/constants";
import { SceneManager } from "./scenes/sceneManager";

async function loadTexture(path: string): Promise<Texture> {
  return Assets.load<Texture>(path);
}

async function bootstrap(): Promise<void> {
  const app = new Application();
  await app.init({
    backgroundColor: 0x000000,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    resizeTo: window
  });

  document.querySelector("#app")?.appendChild(app.canvas);

  const assetPath = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href).toString();
  const [menuBg, regular, area, pusher] = await Promise.all([
    loadTexture(assetPath("assets/menu-bg.jpg")),
    loadTexture(assetPath("assets/tower-regular.jpg")),
    loadTexture(assetPath("assets/tower-area.jpg")),
    loadTexture(assetPath("assets/tower-pusher.jpg"))
  ]);

  const manager = new SceneManager(app, {
    menuBg,
    towers: {
      regular,
      area,
      pusher
    } satisfies Record<TowerKind, Texture>
  });

  manager.showMenu();
  window.addEventListener("resize", () => manager.resize());

  app.ticker.add((ticker) => {
    manager.update(Math.min(ticker.deltaMS / 1000, MAX_DT));
  });
}

bootstrap().catch((error) => {
  const fallback = document.createElement("pre");
  fallback.textContent = `XiR failed to start:\n${String(error)}`;
  fallback.style.color = "white";
  fallback.style.padding = "24px";
  document.body.appendChild(fallback);
  console.error(error);
});
