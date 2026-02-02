import drill from "./drill.svg";
import hammer from "./hammer.svg";
import saw from "./saw.svg";
import wrench from "./wrench.svg";
import screwdriver from "./screwdriver.svg";
import pliers from "./pliers.svg";
import tapeMeasure from "./tape_measure.svg";
import level from "./level.svg";
import ladder from "./ladder.svg";
import shovel from "./shovel.svg";
import rake from "./rake.svg";
import lawnmower from "./lawnmower.svg";
import wheelbarrow from "./wheelbarrow.svg";
import paintRoller from "./paint_roller.svg";
import sander from "./sander.svg";
import axe from "./axe.svg";

export interface ToolIcon {
  key: string;
  label: string;
  src: string;
  category: string;
}

export const TOOL_ICONS: ToolIcon[] = [
  // Power Tools
  { key: "drill", label: "Drill", src: drill, category: "Power Tools" },
  { key: "sander", label: "Sander", src: sander, category: "Power Tools" },
  { key: "lawnmower", label: "Lawnmower", src: lawnmower, category: "Power Tools" },

  // Hand Tools
  { key: "hammer", label: "Hammer", src: hammer, category: "Hand Tools" },
  { key: "saw", label: "Saw", src: saw, category: "Hand Tools" },
  { key: "wrench", label: "Wrench", src: wrench, category: "Hand Tools" },
  { key: "screwdriver", label: "Screwdriver", src: screwdriver, category: "Hand Tools" },
  { key: "pliers", label: "Pliers", src: pliers, category: "Hand Tools" },
  { key: "axe", label: "Axe", src: axe, category: "Hand Tools" },

  // Measuring
  { key: "tape_measure", label: "Tape Measure", src: tapeMeasure, category: "Measuring" },
  { key: "level", label: "Level", src: level, category: "Measuring" },

  // Garden
  { key: "shovel", label: "Shovel", src: shovel, category: "Garden" },
  { key: "rake", label: "Rake", src: rake, category: "Garden" },
  { key: "wheelbarrow", label: "Wheelbarrow", src: wheelbarrow, category: "Garden" },

  // Painting & Finishing
  { key: "paint_roller", label: "Paint Roller", src: paintRoller, category: "Painting" },

  // Large Equipment
  { key: "ladder", label: "Ladder", src: ladder, category: "Large Equipment" },
];

/** Look up an icon by its key */
export function getToolIcon(key: string): ToolIcon | undefined {
  return TOOL_ICONS.find((icon) => icon.key === key);
}

/** Get unique category names in display order */
export function getIconCategories(): string[] {
  const seen = new Set<string>();
  return TOOL_ICONS.reduce<string[]>((cats, icon) => {
    if (!seen.has(icon.category)) {
      seen.add(icon.category);
      cats.push(icon.category);
    }
    return cats;
  }, []);
}
