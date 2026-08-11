import { Container, FederatedPointerEvent, Graphics, Text, TextStyle } from "pixi.js";
import { COLORS } from "../render/colors";

export class SketchButton extends Container {
  private readonly frame = new Graphics();
  private readonly labelText: Text;
  private hovered = false;

  constructor(
    text: string,
    private readonly widthPx: number,
    private readonly heightPx: number,
    private readonly onPress: () => void
  ) {
    super();
    this.eventMode = "static";
    this.cursor = "pointer";

    this.labelText = new Text({
      text,
      style: new TextStyle({
        fill: COLORS.white,
        fontFamily: "monospace",
        fontSize: Math.max(18, Math.floor(heightPx * 0.42)),
        letterSpacing: 3
      })
    });
    this.labelText.anchor.set(0.5);
    this.labelText.position.set(widthPx / 2, heightPx / 2);

    this.addChild(this.frame, this.labelText);
    this.redraw();

    this.on("pointerenter", () => {
      this.hovered = true;
      this.redraw();
    });
    this.on("pointerleave", () => {
      this.hovered = false;
      this.redraw();
    });
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.onPress();
    });
  }

  setText(text: string): void {
    this.labelText.text = text;
  }

  private redraw(): void {
    this.frame.clear();
    this.frame
      .rect(0, 0, this.widthPx, this.heightPx)
      .fill({ color: COLORS.black, alpha: this.hovered ? 0.92 : 0.72 })
      .stroke({ color: this.hovered ? COLORS.yellow : COLORS.white, width: this.hovered ? 3 : 2 });
  }
}
