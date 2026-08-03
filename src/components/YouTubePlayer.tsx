"use client";

import { useEffect } from "react";
import { useYouTubePlayer, type YouTubePlayerControls } from "@/hooks/useYouTubePlayer";

interface YouTubePlayerProps {
  videoId: string;
  /**
   * プレイヤーの制御ハンドル(play/pause/getCurrentTime等)を
   * 親コンポーネントに渡すコールバック。
   * タイピング判定システムはこれを受け取って、判定ループの中で
   * controls.getCurrentTime() を呼び出す想定。
   */
  onControlsReady?: (controls: YouTubePlayerControls) => void;
}

export default function YouTubePlayer({
  videoId,
  onControlsReady,
}: YouTubePlayerProps) {
  const controls = useYouTubePlayer(videoId);

  // レンダー中に親のstateを更新すると
  // "Cannot update a component while rendering a different component" になるため、
  // useEffect内で通知する
  useEffect(() => {
    onControlsReady?.(controls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.isReady, controls.playbackState]);

  return (
    <div className="w-full max-w-2xl">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <div id={controls.containerId} className="h-full w-full" />
      </div>
      {!controls.isReady && (
        <p className="mt-2 text-sm text-zinc-500">プレイヤーを読み込み中...</p>
      )}
    </div>
  );
}