import type { Metadata } from "next";
import BouncingEmoji from "./bouncing-emoji";

export const metadata: Metadata = {
  title: "Emoji DVD Screensaver",
  description: "An emoji bouncing around the screen like the classic DVD logo.",
};

export default function DvdPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-950">
      <BouncingEmoji />
    </div>
  );
}
