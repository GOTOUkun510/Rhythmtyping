"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

const WORDS = [
  "keyboard", "computer", "challenge", "algorithm", "developer",
  "beautiful", "wonderful", "important", "different", "technology",
  "experience", "management", "understand", "conversation", "background",
  "confidence", "structure", "framework", "important", "dashboard",
  "adventure", "knowledge", "celebration", "environment", "creativity",
];

const START_BEAT_MS = 850; // initial ms per beat
const MIN_BEAT_MS = 260; // fastest the beat can get
const ACCEL = 0.94; // multiply beat interval by this on each success (speeds up)
const BEATS_PER_WORD = 6; // time budget per word, in beats (~5s at start tempo)

// Keys that don't count as a "keystroke" toward the typing count
const NON_KEYSTROKE_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "Tab",
  "CapsLock",
]);

function randomWord(exclude?: string) {
  let w = WORDS[Math.floor(Math.random() * WORDS.length)];
  while (w === exclude) {
    w = WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return w;
}

export default function Home() {
  const [word, setWord] = useState(WORDS[0]); // fixed initial value for SSR/CSR match
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [beat, setBeat] = useState(0);
  const [progress, setProgress] = useState(1);
  const [message, setMessage] = useState("");
  const [beatMs, setBeatMs] = useState(START_BEAT_MS);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }, []);

  const beep = useCallback(
    (freq: number, duration: number, volume = 0.05) => {
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + duration
        );
        osc.stop(ctx.currentTime + duration);
      } catch {
        // ignore audio errors (e.g. no user gesture yet)
      }
    },
    [getAudioCtx]
  );

  // Pick the first real random word only after mounting on the client
  useEffect(() => {
    setWord(randomWord());
  }, []);

  // Keep focus on the input at all times
  useEffect(() => {
    inputRef.current?.focus();
  });

  const nextWord = useCallback((current: string) => {
    setWord(randomWord(current));
    setInput("");
    setProgress(1);
  }, []);

  // Rhythm pulse ("pi, pi") - ticks every beat, speeds up as beatMs shrinks
  useEffect(() => {
    if (gameOver || !started) return;
    const id = setInterval(() => {
      setBeat((b) => b + 1);
      // Pitch rises from 880Hz up to ~1600Hz as the tempo speeds up
      const speedRatio =
        (START_BEAT_MS - beatMs) / (START_BEAT_MS - MIN_BEAT_MS);
      const freq = 880 + speedRatio * 720;
      beep(freq, 0.06, 0.35);
    }, beatMs);
    return () => clearInterval(id);
  }, [beatMs, gameOver, started, beep]);

  // Countdown progress bar for the current word (time budget) - speeds up too
  useEffect(() => {
    if (gameOver || !started) return;
    const totalMs = beatMs * BEATS_PER_WORD;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1 - elapsed / totalMs);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(id);
        beep(140, 0.35, 0.45);
        setGameOver(true);
      }
    }, 30);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, beatMs, started, gameOver]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (gameOver || NON_KEYSTROKE_KEYS.has(e.key)) return;
    setKeystrokes((k) => k + 1);
    beep(1800, 0.02, 0.12);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (gameOver) return;
    const value = e.target.value;
    setInput(value);
    if (!started) setStarted(true);
    if (value === word) {
      const bonus = Math.round(progress * 50);
      setScore((s) => s + 10 + bonus);
      setCombo((c) => c + 1);
      setMessage(progress > 0.6 ? "Perfect!" : "Good!");
      setBeatMs((ms) => Math.max(MIN_BEAT_MS, Math.round(ms * ACCEL)));
      beep(1400, 0.09, 0.4);
      nextWord(word);
    }
  }

  function restart() {
    setScore(0);
    setCombo(0);
    setBeatMs(START_BEAT_MS);
    setGameOver(false);
    setStarted(false);
    setMessage("");
    setProgress(1);
    setWord(randomWord());
    setInput("");
    setKeystrokes(0);
  }

  const urgent = progress < 0.3 && !gameOver;

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black min-h-screen overflow-hidden">
      <Link
        href="/dvd"
        className="absolute right-4 top-4 text-sm font-medium text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        DVD Emoji →
      </Link>
      <main
        className={`flex w-full max-w-lg flex-col items-center gap-8 px-8 py-16 transition-transform ${
          urgent ? "animate-shake" : ""
        }`}
      >
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Rhythm Typing
        </h1>

        {!gameOver && (
          <>
            {/* Beat pulse indicator ("pi, pi") */}
            <div
              key={beat}
              className={`h-3 w-3 rounded-full ${
                urgent ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ animation: "pulse-beat 0.4s ease-out" }}
            />

            {/* Progress bar (time budget for current word) */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ease-linear ${
                  urgent ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div
              className={`text-4xl font-bold tracking-widest text-black dark:text-zinc-50 transition-transform ${
                message === "Perfect!" ? "scale-110" : ""
              }`}
            >
              {word}
            </div>

            <input
              ref={inputRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              autoFocus
              spellCheck={false}
              className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-xl text-black outline-none dark:bg-zinc-900 dark:text-zinc-50 transition-colors ${
                urgent
                  ? "border-red-500"
                  : "border-zinc-300 focus:border-emerald-500 dark:border-zinc-700"
              }`}
              placeholder="Type the word..."
            />

            <div className="flex w-full justify-between text-lg font-medium text-black dark:text-zinc-50">
              <span>Score: {score}</span>
              <span>Combo: {combo}</span>
              <span>Speed: {Math.round(START_BEAT_MS / beatMs * 100) / 100}x</span>
            </div>

            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Keystrokes: {keystrokes}
            </div>

            {message && (
              <p
                key={message + score}
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pop"
              >
                {message}
              </p>
            )}
          </>
        )}

        {gameOver && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-3xl font-extrabold text-red-500">OUT!</p>
            <p className="text-lg text-black dark:text-zinc-50">
              Final Score: <span className="font-bold">{score}</span>
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Max Combo reached this run: {combo}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Keystrokes: {keystrokes}
            </p>
            <button
              onClick={restart}
              className="rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Retry
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse-beat {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop {
          animation: pop 0.25s ease-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.15s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
