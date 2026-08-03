"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LyricsData, LyricsNote } from "@/types/lyrics";
import type { YouTubePlayerControls } from "@/hooks/useYouTubePlayer";
import { useTyping } from "@/hooks/useTyping";

interface NoteRuntime extends LyricsNote {
  lineId: string;
}

type Judgement = "◯" | "✕" | null;

interface TypingGameProps {
  lyrics: LyricsData;
  controls: YouTubePlayerControls;
}

const JUDGE_DISPLAY_MS = 500;
// ノーツが判定ラインに到達するまでの猶予時間(秒)。この秒数分だけ奥から手前に降ってくる。
// 最初のノーツの3秒前からレーンに表示・準備できるようにする。
const LANE_LEAD_SECONDS = 3;

// レーンのビューポート(SVG座標系)。奥(上)が狭く、手前(判定ライン)が広い台形。
const LANE_W = 400;
const LANE_H = 340;
const VANISH_TOP = 130; // 奥側の消失開始Y座標(パースの起点)
const JUDGE_LINE_Y = 300; // 判定ラインのY座標
const TOP_HALF_WIDTH = 18; // 奥側(消失点付近)のレーン半幅
const BOTTOM_HALF_WIDTH = 170; // 手前側(判定ライン)のレーン半幅
const CENTER_X = LANE_W / 2;

/** progress(0=奥/出現 〜 1=判定ライン)からレーン上のY座標を返す(イーズイン: 奥はゆっくり、手前は速く) */
function progressToY(progress: number) {
  const eased = progress * progress; // 奥はゆっくり、判定ラインに近づくほど加速して見える
  return VANISH_TOP + eased * (JUDGE_LINE_Y - VANISH_TOP);
}

/** progressからそのYにおけるレーン半幅を返す(台形の遠近補間) */
function progressToHalfWidth(progress: number) {
  return TOP_HALF_WIDTH + progress * (BOTTOM_HALF_WIDTH - TOP_HALF_WIDTH);
}

export default function TypingGame({ lyrics, controls }: TypingGameProps) {
  const allNotes = useMemo<NoteRuntime[]>(() => {
    const notes: NoteRuntime[] = [];
    for (const line of lyrics.lines) {
      for (const note of line.notes) {
        notes.push({ ...note, lineId: line.id });
      }
    }
    return notes.sort((a, b) => a.start - b.start);
  }, [lyrics]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [judgement, setJudgement] = useState<Judgement>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalJudged, setTotalJudged] = useState(0);
  const [nowTime, setNowTime] = useState(0);

  const activeNote = allNotes[activeIndex] as NoteRuntime | undefined;
  const nextNote = allNotes[activeIndex + 1] as NoteRuntime | undefined;
  // 歌のタイミング(start〜end区間)内にいる間だけ入力を受け付ける。
  // 区間外(まだ早い/もう過ぎた)でのキー入力は判定に反映しない。
  const isWithinNoteWindow = Boolean(
    activeNote && nowTime >= activeNote.start && nowTime <= activeNote.end
  );
  const typing = useTyping(activeNote?.kana ?? "", isWithinNoteWindow);

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const typingRef = useRef(typing);
  typingRef.current = typing;
  const judgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showJudgement(result: "◯" | "✕") {
    setJudgement(result);
    if (judgeTimeoutRef.current) clearTimeout(judgeTimeoutRef.current);
    judgeTimeoutRef.current = setTimeout(() => setJudgement(null), JUDGE_DISPLAY_MS);
  }

  useEffect(() => {
    if (typing.noteCleared && activeNote) {
      showJudgement("◯");
      setScore((s) => s + 100);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
      setCorrectCount((c) => c + 1);
      setTotalJudged((c) => c + 1);
      setActiveIndex((i) => Math.min(i + 1, allNotes.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing.noteCleared]);

  useEffect(() => {
    if (!controls.isReady) return;

    let raf = 0;
    const tick = () => {
      const time = controls.getCurrentTime();
      setNowTime(time);

      const idx = activeIndexRef.current;
      const note = allNotes[idx];

      if (note && time > note.end) {
        if (!typingRef.current.noteCleared) {
          showJudgement("✕");
          setCombo(0);
          setTotalJudged((c) => c + 1);
        }
        setActiveIndex((i) => Math.min(i + 1, allNotes.length));
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controls, allNotes]);

  useEffect(() => {
    return () => {
      if (judgeTimeoutRef.current) clearTimeout(judgeTimeoutRef.current);
    };
  }, []);

  const laneNotes = allNotes.filter(
    (note) => note.start - nowTime <= LANE_LEAD_SECONDS && nowTime <= note.end
  );

  const accuracy =
    totalJudged === 0 ? 100 : Math.round((correctCount / totalJudged) * 100);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200">
        <span>SCORE {score}</span>
        <span>
          COMBO {combo} (MAX {maxCombo})
        </span>
        <span>正確率 {accuracy}%</span>
      </div>

      {/* プロセカ風の縦レーン(台形パース) */}
      <div className="relative w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
        <svg
          viewBox={`0 0 ${LANE_W} ${LANE_H}`}
          className="block w-full"
          style={{ height: 300 }}
        >
          <defs>
            <linearGradient id="laneFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.05" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.38" />
            </linearGradient>
            <linearGradient id="laneEdge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* 背景(星っぽい点) */}
          <rect x="0" y="0" width={LANE_W} height={LANE_H} fill="#09090b" />

          {/* レーン本体(台形) */}
          <polygon
            points={`${CENTER_X - TOP_HALF_WIDTH},${VANISH_TOP} ${CENTER_X + TOP_HALF_WIDTH},${VANISH_TOP} ${CENTER_X + BOTTOM_HALF_WIDTH},${JUDGE_LINE_Y} ${CENTER_X - BOTTOM_HALF_WIDTH},${JUDGE_LINE_Y}`}
            fill="url(#laneFill)"
          />

          {/* レーン左右の縁ライン */}
          <line
            x1={CENTER_X - TOP_HALF_WIDTH}
            y1={VANISH_TOP}
            x2={CENTER_X - BOTTOM_HALF_WIDTH}
            y2={JUDGE_LINE_Y}
            stroke="url(#laneEdge)"
            strokeWidth={2}
          />
          <line
            x1={CENTER_X + TOP_HALF_WIDTH}
            y1={VANISH_TOP}
            x2={CENTER_X + BOTTOM_HALF_WIDTH}
            y2={JUDGE_LINE_Y}
            stroke="url(#laneEdge)"
            strokeWidth={2}
          />
          {/* 中央ガイドライン */}
          <line
            x1={CENTER_X}
            y1={VANISH_TOP}
            x2={CENTER_X}
            y2={JUDGE_LINE_Y}
            stroke="#3f3f46"
            strokeWidth={1}
          />

          {/* 奥行きの横グリッド線 */}
          {[0.2, 0.4, 0.6, 0.8].map((p) => {
            const y = progressToY(p);
            const hw = progressToHalfWidth(p);
            return (
              <line
                key={p}
                x1={CENTER_X - hw}
                y1={y}
                x2={CENTER_X + hw}
                y2={y}
                stroke="#27272a"
                strokeWidth={1}
              />
            );
          })}

          {/* 判定ライン */}
          <line
            x1={CENTER_X - BOTTOM_HALF_WIDTH - 6}
            y1={JUDGE_LINE_Y}
            x2={CENTER_X + BOTTOM_HALF_WIDTH + 6}
            y2={JUDGE_LINE_Y}
            stroke="#34d399"
            strokeWidth={4}
            style={{ filter: "drop-shadow(0 0 6px #34d399)" }}
          />

          {/* ノーツ本体(台形の遠近に沿って降ってくる)。バーの中に歌詞、上に残り秒数を表示 */}
          {laneNotes.map((note) => {
            const remaining = note.start - nowTime; // 正: 判定ラインまでの残り秒, 負: 通過後(打てる猶予中)
            const rawProgress = 1 - remaining / LANE_LEAD_SECONDS;
            // 判定ライン到達後(remaining<=0)はendまでその場(judge line上)に留める
            const progress = remaining <= 0 ? 1 : Math.min(Math.max(rawProgress, 0), 1);
            const y = progressToY(progress);
            const hw = progressToHalfWidth(progress) * 0.92;
            const isActive = note.id === activeNote?.id;
            const noteHeight = 16 + progress * 22;
            const fontSize = 11 + progress * 8;

            // 表示用の状態文字列: まだ早い/今打てる(残り-秒)/通過後
            let statusLabel: string;
            if (remaining > 0) {
              statusLabel = `あと${remaining.toFixed(1)}秒`;
            } else if (note.id === activeNote?.id && nowTime <= note.end) {
              statusLabel = `打てる！残り${(note.end - nowTime).toFixed(1)}秒`;
            } else {
              statusLabel = "";
            }

            return (
              <g key={note.id} opacity={0.55 + Math.min(progress, 1) * 0.45}>
                <rect
                  x={CENTER_X - hw}
                  y={y - noteHeight / 2}
                  width={hw * 2}
                  height={noteHeight}
                  rx={noteHeight / 2}
                  fill={isActive ? "#34d399" : "#a1a1aa"}
                  stroke={isActive ? "#6ee7b7" : "#52525b"}
                  strokeWidth={isActive ? 2 : 1}
                  style={
                    isActive
                      ? { filter: "drop-shadow(0 0 8px rgba(52,211,153,0.9))" }
                      : undefined
                  }
                />
                {/* バーの中に歌詞テキスト */}
                <text
                  x={CENTER_X}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight={700}
                  fill="#09090b"
                >
                  {note.text}
                </text>
                {/* バーの上に残り秒数などのステータス */}
                {statusLabel && progress > 0.15 && (
                  <text
                    x={CENTER_X}
                    y={y - noteHeight / 2 - 6}
                    textAnchor="middle"
                    fontSize={Math.max(fontSize * 0.7, 9)}
                    fill={isActive ? "#6ee7b7" : "#a1a1aa"}
                  >
                    {statusLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-1 rounded-lg bg-zinc-800 px-4 py-3">
        {activeNote ? (
          <>
            {/* 1段目: かな(進捗に応じて左から明るく) */}
            <div className="text-xl font-medium tracking-wider">
              <span className="text-white">
                {activeNote.kana.slice(0, typing.typedKanaCount)}
              </span>
              <span className="text-zinc-500">
                {activeNote.kana.slice(typing.typedKanaCount)}
              </span>
            </div>
            {/* 2段目: ローマ字(打った分/現在文字強調/残り) */}
            <div className="text-2xl font-mono tracking-wider">
              <span className="text-zinc-500">{typing.typed}</span>
              <span className="rounded bg-emerald-500 px-0.5 text-zinc-900">
                {typing.current}
              </span>
              <span className="text-zinc-400">{typing.remaining}</span>
            </div>
            {/* 3段目: 元の歌詞(漢字表記) */}
            <div className="text-sm text-zinc-400">{activeNote.text}</div>
            {/* 4段目: 次のノーツのプレビュー */}
            <div className="text-xs text-zinc-600">
              {nextNote ? nextNote.text : ""}
            </div>
          </>
        ) : (
          <span className="text-zinc-500">完了</span>
        )}
      </div>


      <div className="flex h-10 items-center justify-center">
        {judgement && (
          <span
            className={
              judgement === "◯"
                ? "text-3xl font-bold text-emerald-400"
                : "text-3xl font-bold text-rose-500"
            }
          >
            {judgement}
          </span>
        )}
      </div>

      <div className="rounded-lg bg-zinc-800 p-4 text-sm leading-relaxed text-zinc-300">
        {lyrics.lines.map((line) => (
          <p key={line.id}>
            {line.notes.map((n) => (
              <span
                key={n.id}
                className={
                  activeNote?.id === n.id ? "rounded bg-emerald-600 px-1 text-white" : ""
                }
              >
                {n.text}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}