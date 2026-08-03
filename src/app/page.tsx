"use client";

import { useEffect, useRef, useState } from "react";
import YouTubePlayer from "@/components/YouTubePlayer";
import Sidebar from "@/components/Sidebar";
import TypingGame from "@/components/TypingGame";
import type { YouTubePlayerControls } from "@/hooks/useYouTubePlayer";
import melt from "@/data/melt.json";
import type { LyricsData } from "@/types/lyrics";

const VIDEO_ID = "o1jAMSQyVPc";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const lyrics = melt as LyricsData;

// 最初のノーツの何秒前から準備できるようにするか(TypingGame側のLANE_LEAD_SECONDSと合わせる)
const LEAD_SECONDS = 3;

function getFirstNoteStart(data: LyricsData): number | null {
  let first: number | null = null;
  for (const line of data.lines) {
    for (const note of line.notes) {
      if (first === null || note.start < first) first = note.start;
    }
  }
  return first;
}

export default function Home() {
  const [controls, setControls] = useState<YouTubePlayerControls | null>(null);
  const didSeekRef = useRef(false);

  // プレイヤーの準備ができたら、最初のノーツの3秒前まで自動で頭出しする
  useEffect(() => {
    if (!controls || !controls.isReady || didSeekRef.current) return;
    const firstStart = getFirstNoteStart(lyrics);
    if (firstStart === null) return;
    const seekTarget = Math.max(0, firstStart - LEAD_SECONDS);
    controls.seekTo(seekTarget);
    didSeekRef.current = true;
  }, [controls]);

  return (
    <div className="flex min-h-screen bg-zinc-900">
      <Sidebar />
      <div className="flex flex-1 flex-col items-center gap-4 px-4 py-10">
        <YouTubePlayer videoId={VIDEO_ID} onControlsReady={setControls} />
        <p className="text-sm text-zinc-400">{VIDEO_URL}</p>
        {controls && controls.isReady ? (
          <TypingGame lyrics={lyrics} controls={controls} />
        ) : (
          <p className="text-sm text-zinc-500">動画の準備中です…</p>
        )}
      </div>
    </div>
  );
}