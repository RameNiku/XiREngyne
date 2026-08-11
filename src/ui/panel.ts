import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { COLORS } from "../render/colors";

export class SketchPanel extends Container {
  readonly background = new Graphics();
  private readonly titleText?: Text;

  constructor(width: number, height: number, title?: string) {
    super();
    this.addChild(this.background);

    this.background
      .rect(0, 0, width, height)
      .fill({ color: COLORS.black, alpha: 0.78 })
      .stroke({ color: COLORS.white, width: 2 });

    if (title) {
      this.titleText = new Text({
        text: title,
        style: new TextStyle({
          fill: COLORS.white,
          fontFamily: "monospace",
          fontSize: 20,
          letterSpacing: 2
        })
      });
      this.titleText.position.set(14, 10);
      this.addChild(this.titleText);
    }
  }
}
