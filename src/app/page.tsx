"use client";

import YouTubePlayer from "@/components/YouTubePlayer";
import type { YouTubePlayerControls } from "@/hooks/useYouTubePlayer";

const VIDEO_ID = "o1jAMSQyVPc";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

const LYRICS_RAW = `[00:24:17]朝　[00:24:90]目が覚め[00:25:62]て[00:25:76]
[00:26:38]真っ先に[00:27:79]思い浮か[00:29:51]ぶ　[00:30:23]君の[00:32:12]こと[00:33:92]
[00:35:52]思い[00:36:52]切っ[00:37:02]て　[00:37:88]前髪を[00:39:02]切った[00:39:62]
[00:39:76]「どうしたの？」っ[00:41:30]て　聞かれたく[00:43:62]て[00:43:73]`;

export default function Home() {
  // タイピング判定システムはここで controls を受け取り、
  // controls.getCurrentTime() をrequestAnimationFrame等のループから呼び出して
  // ノーツのタイムスタンプと突き合わせる想定。
  const handleControlsReady = (controls: YouTubePlayerControls) => {
    void controls;
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-zinc-50 px-4 py-10 dark:bg-black">
      <YouTubePlayer videoId={VIDEO_ID} onControlsReady={handleControlsReady} />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{VIDEO_URL}</p>
      <pre className="w-full max-w-2xl whitespace-pre-wrap break-words text-sm text-black dark:text-zinc-50">
        {LYRICS_RAW}
      </pre>
    </div>
  );
}
