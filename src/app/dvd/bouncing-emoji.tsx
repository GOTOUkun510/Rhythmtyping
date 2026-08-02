"use client";

import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "🍕",
  "🚀",
  "👾",
  "🐙",
  "🍩",
  "🦄",
  "💾",
  "🎧",
  "🔥",
  "🌈",
  "🍉",
  "🛸",
];

/** Travel speed in pixels per second. */
const SPEED = 260;
/** Clamp on frame delta so a backgrounded tab doesn't teleport the sprite through a wall. */
const MAX_FRAME_SECONDS = 0.05;

type Motion = { x: number; y: number; vx: number; vy: number };

export default function BouncingEmoji() {
  const stageRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<Motion>({ x: 0, y: 0, vx: 0, vy: 0 });
  const boundsRef = useRef({ maxX: 0, maxY: 0 });

  const [paused, setPaused] = useState(false);
  const [bounces, setBounces] = useState(0);
  const [corners, setCorners] = useState(0);

  const emoji = EMOJIS[bounces % EMOJIS.length];
  const hue = (bounces * 47) % 360;

  // Start heading in a random diagonal direction from a random spot on the stage.
  useEffect(() => {
    const stage = stageRef.current;
    const sprite = spriteRef.current;
    if (!stage || !sprite) return;

    const measure = () => {
      const maxX = Math.max(stage.clientWidth - sprite.offsetWidth, 0);
      const maxY = Math.max(stage.clientHeight - sprite.offsetHeight, 0);
      boundsRef.current = { maxX, maxY };

      // Keep the sprite inside the stage when the viewport shrinks.
      const motion = motionRef.current;
      motion.x = Math.min(motion.x, maxX);
      motion.y = Math.min(motion.y, maxY);
    };

    measure();

    const { maxX, maxY } = boundsRef.current;
    const angle = Math.PI / 4 + (Math.random() * Math.PI) / 2; // 45°–135°
    motionRef.current = {
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      vx: Math.cos(angle) * SPEED * (Math.random() < 0.5 ? -1 : 1),
      vy: Math.sin(angle) * SPEED * (Math.random() < 0.5 ? -1 : 1),
    };

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;

    const draw = () => {
      const { x, y } = motionRef.current;
      sprite.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    if (paused) {
      draw();
      return;
    }

    let frame = 0;
    let previous = performance.now();

    const step = (now: number) => {
      const delta = Math.min((now - previous) / 1000, MAX_FRAME_SECONDS);
      previous = now;

      const motion = motionRef.current;
      const { maxX, maxY } = boundsRef.current;

      motion.x += motion.vx * delta;
      motion.y += motion.vy * delta;

      let hitVertical = false;
      let hitHorizontal = false;

      if (motion.x <= 0) {
        motion.x = 0;
        motion.vx = Math.abs(motion.vx);
        hitVertical = true;
      } else if (motion.x >= maxX) {
        motion.x = maxX;
        motion.vx = -Math.abs(motion.vx);
        hitVertical = true;
      }

      if (motion.y <= 0) {
        motion.y = 0;
        motion.vy = Math.abs(motion.vy);
        hitHorizontal = true;
      } else if (motion.y >= maxY) {
        motion.y = maxY;
        motion.vy = -Math.abs(motion.vy);
        hitHorizontal = true;
      }

      if (hitVertical || hitHorizontal) {
        setBounces((count) => count + 1);
        // Both axes in the same frame means the sprite landed in a corner.
        if (hitVertical && hitHorizontal) setCorners((count) => count + 1);
      }

      draw();
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Emoji DVD Screensaver
          </h1>
          <p className="text-sm text-zinc-400">
            Waiting for that perfect corner hit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <dl className="flex gap-3 text-right">
            <div className="rounded-lg bg-zinc-900 px-3 py-1.5">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">
                Bounces
              </dt>
              <dd className="font-mono text-lg text-zinc-100 tabular-nums">
                {bounces}
              </dd>
            </div>
            <div className="rounded-lg bg-zinc-900 px-3 py-1.5">
              <dt className="text-[10px] uppercase tracking-widest text-zinc-500">
                Corners
              </dt>
              <dd className="font-mono text-lg text-zinc-100 tabular-nums">
                {corners}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      <div
        ref={stageRef}
        className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-black"
      >
        <div
          ref={spriteRef}
          aria-hidden
          className="absolute left-0 top-0 select-none text-6xl leading-none will-change-transform sm:text-7xl"
          style={{
            filter: `drop-shadow(0 0 24px hsl(${hue} 90% 60%))`,
          }}
        >
          {emoji}
        </div>
        <p className="sr-only" aria-live="polite">
          {corners} corner hits after {bounces} bounces.
        </p>
      </div>
    </div>
  );
}
