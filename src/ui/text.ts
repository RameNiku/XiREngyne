import { Text, TextStyle } from "pixi.js";
import { COLORS } from "../render/colors";

export function sketchText(text: string, size = 22, fill = COLORS.white): Text {
  return new Text({
    text,
    style: new TextStyle({
      fill,
      fontFamily: "monospace",
      fontSize: size,
      letterSpacing: 1
    })
  });
}
