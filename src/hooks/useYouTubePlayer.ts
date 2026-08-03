"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

// YouTube IFrame Player API の最小限の型定義
// (公式に @types/youtube 等が無いため、必要な範囲だけ自前で定義する)
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (event: YTPlayerEvent) => void;
        onStateChange?: (event: YTPlayerEvent) => void;
        onError?: (event: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

let apiLoadingPromise: Promise<void> | null = null;

/**
 * YouTube IFrame API のスクリプトを一度だけ読み込む。
 * 既にAPIが読み込み済み(window.YT.Player が使える状態)ならすぐ解決する。
 */
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("windowが存在しない環境です"));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (apiLoadingPromise) {
    return apiLoadingPromise;
  }

  apiLoadingPromise = new Promise<void>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    const existingScript = document.querySelector(
      `script[src="${IFRAME_API_SRC}"]`
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = IFRAME_API_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return apiLoadingPromise;
}

export type PlaybackState =
  | "unstarted"
  | "ended"
  | "playing"
  | "paused"
  | "buffering"
  | "cued";

export interface YouTubePlayerControls {
  /** プレイヤーのDOMマウント先に渡すID */
  containerId: string;
  /** APIの読み込み・プレイヤーの初期化が完了したか */
  isReady: boolean;
  /** 現在の再生状態 */
  playbackState: PlaybackState;
  /** 動画を再生する */
  play: () => void;
  /** 動画を一時停止する */
  pause: () => void;
  /** 指定秒数にシークする */
  seekTo: (seconds: number) => void;
  /**
   * 現在の再生時刻(秒)を同期的に取得する。
   * タイピング判定のような高頻度の呼び出しを想定し、
   * Reactのstateではなくプレイヤーから直接値を取る関数を返す。
   */
  getCurrentTime: () => number;
}

/**
 * YouTube動画をIFrameで埋め込み、再生制御・現在時刻取得を提供するフック。
 * タイピング判定側は getCurrentTime() を使って、requestAnimationFrame等の
 * ループの中から現在の再生位置を都度取得する想定。
 *
 * React StrictMode (開発時) では effect が
 * マウント→クリーンアップ→再マウント と二重実行されるため、
 * 非同期のPlayer生成が完了する前にクリーンアップが走っても
 * 確実に破棄できるよう、生成完了を待ってから判定する。
 */
export function useYouTubePlayer(videoId: string): YouTubePlayerControls {
  // useId() はサーバー/クライアントで同じ値を返すため、Hydration不一致を防げる。
  // Math.random() 等は使わない (SSRとCSRで値がズレてHydrationエラーになるため)。
  const reactId = useId();
  const containerId = `youtube-player-${reactId.replace(/:/g, "")}`;

  const playerRef = useRef<YTPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [playbackState, setPlaybackState] =
    useState<PlaybackState>("unstarted");

  useEffect(() => {
    let destroyed = false;

    loadYouTubeIframeApi().then(() => {
      if (destroyed) return;
      const YT = window.YT;
      if (!YT) return;

      // コンテナのdivがまだDOMに存在しない場合は次のフレームまで待つ
      const container = document.getElementById(containerId);
      if (!container) return;

      const player = new YT.Player(containerId, {
        videoId,
        playerVars: {
          // 見た目上の演出はゲーム側で作るため、標準UIは最小限にする
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            if (destroyed) {
              // マウント直後にクリーンアップされていた場合はここで破棄する
              player.destroy();
              return;
            }
            setIsReady(true);
          },
          onStateChange: (event) => {
            if (destroyed) return;
            const stateMap: Record<number, PlaybackState> = {
              [-1]: "unstarted",
              0: "ended",
              1: "playing",
              2: "paused",
              3: "buffering",
              5: "cued",
            };
            setPlaybackState(stateMap[event.data] ?? "unstarted");
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      setIsReady(false);
    };
    // videoId が変わったらプレイヤーを作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, containerId]);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime() ?? 0;
  }, []);

  return {
    containerId,
    isReady,
    playbackState,
    play,
    pause,
    seekTo,
    getCurrentTime,
  };
}