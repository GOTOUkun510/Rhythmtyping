"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Gtyping (C:\Users\GOTOUkun510\Desktop\Vercel\Gtyping\src\hooks\useTyping.ts) の
// buildInputEngine/segmentKana を参考に、Rhythmtyping用に簡略化したタイピングエンジン。
// ロジック(セグメント単位でのローマ字複数パターン判定、促音の子音重ね、撥音のn/nn)を踏襲し、
// JISかな入力・記号省略モード等は対象外とする。

const KANA_PATTERNS: Record<string, string[]> = {
  あ: ["a"], い: ["i", "yi"], う: ["u", "wu", "whu"], え: ["e"], お: ["o"],
  か: ["ka", "ca"], き: ["ki"], く: ["ku", "cu", "qu"], け: ["ke"], こ: ["ko", "co"],
  きゃ: ["kya"], きぃ: ["kyi"], きゅ: ["kyu"], きぇ: ["kye"], きょ: ["kyo"],
  さ: ["sa"], し: ["shi", "si", "ci"], す: ["su"], せ: ["se", "ce"], そ: ["so"],
  しゃ: ["sha", "sya"], しぃ: ["syi"], しゅ: ["shu", "syu"], しぇ: ["she", "sye"], しょ: ["sho", "syo"],
  た: ["ta"], ち: ["chi", "ti"], つ: ["tsu", "tu"], て: ["te"], と: ["to"],
  ちゃ: ["cha", "tya"], ちぃ: ["tyi"], ちゅ: ["chu", "tyu"], ちぇ: ["che", "tye"], ちょ: ["cho", "tyo", "cyo"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  にゃ: ["nya"], にぃ: ["nyi"], にゅ: ["nyu"], にぇ: ["nye"], にょ: ["nyo"],
  は: ["ha"], ひ: ["hi"], ふ: ["fu", "hu"], へ: ["he"], ほ: ["ho"],
  ひゃ: ["hya"], ひぃ: ["hyi"], ひゅ: ["hyu"], ひぇ: ["hye"], ひょ: ["hyo"],
  ふぁ: ["fa", "fwa"], ふぃ: ["fi", "fwi", "fyi"], ふぅ: ["fwu"], ふぇ: ["fe", "fwe", "fye"], ふぉ: ["fo", "fwo"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  みゃ: ["mya"], みぃ: ["myi"], みゅ: ["myu"], みぇ: ["mye"], みょ: ["myo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"],
  ゃ: ["lya", "xya"], ゅ: ["lyu", "xyu"], ょ: ["lyo", "xyo"],
  ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"],
  りゃ: ["rya"], りぃ: ["ryi"], りゅ: ["ryu"], りぇ: ["rye"], りょ: ["ryo"],
  わ: ["wa"], を: ["wo"],
  ん: ["nn", "xn"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"],
  ぎゃ: ["gya"], ぎぃ: ["gyi"], ぎゅ: ["gyu"], ぎぇ: ["gye"], ぎょ: ["gyo"],
  ざ: ["za"], じ: ["ji", "zi"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  じゃ: ["ja", "zya"], じぃ: ["zyi", "jyi"], じゅ: ["ju", "zyu"], じぇ: ["je", "zye"], じょ: ["jo", "zyo"],
  だ: ["da"], ぢ: ["di"], づ: ["du"], で: ["de"], ど: ["do"],
  ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"],
  びゃ: ["bya"], びぃ: ["byi"], びゅ: ["byu"], びぇ: ["bye"], びょ: ["byo"],
  ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],
  ぴゃ: ["pya"], ぴぃ: ["pyi"], ぴゅ: ["pyu"], ぴぇ: ["pye"], ぴょ: ["pyo"],
  ゔぁ: ["va"], ゔぃ: ["vi"], ゔ: ["vu"], ゔぇ: ["ve"], ゔぉ: ["vo"],
  ぁ: ["la", "xa"], ぃ: ["li", "xi"], ぅ: ["lu", "xu"], ぇ: ["le", "xe"], ぉ: ["lo", "xo"],
  っ: ["ltu", "xtu", "ltsu", "xtsu"],
  ー: ["-"], "　": [" "], " ": [" "],
  "。": ["."], "、": [","], "・": ["/"],
  "「": ["["], "」": ["]"], "（": ["("], "）": [")"],
  "！": ["!"], "？": ["?"], "…": ["..."], "〜": ["~"], "～": ["~"],
  "：": [":"], "；": [";"],
};

export function kanaToRoman(kana: string): string {
  let result = "";
  let i = 0;
  while (i < kana.length) {
    if (i + 1 < kana.length) {
      const two = kana.slice(i, i + 2);
      if (KANA_PATTERNS[two]) {
        result += KANA_PATTERNS[two][0];
        i += 2;
        continue;
      }
    }
    if (kana[i] === "っ" && i + 1 < kana.length) {
      const nxt2 = kana.slice(i + 1, i + 3);
      const nxt1 = kana[i + 1];
      const rep = KANA_PATTERNS[nxt2]
        ? KANA_PATTERNS[nxt2][0]
        : KANA_PATTERNS[nxt1]
        ? KANA_PATTERNS[nxt1][0]
        : null;
      if (rep) {
        result += rep[0];
        i++;
        continue;
      }
    }
    if (kana[i] === "ん") {
      const nx = kana[i + 1];
      const needDouble = nx && "あいうえおなにぬねのやゆよん".includes(nx);
      result += needDouble ? "nn" : "n";
      i++;
      continue;
    }
    const r = KANA_PATTERNS[kana[i]];
    result += r ? r[0] : kana[i];
    i++;
  }
  return result;
}

type Seg = { kanaLen: number; patterns: string[]; display: string };

function segmentKana(kana: string): Seg[] {
  const segs: Seg[] = [];
  let i = 0;
  while (i < kana.length) {
    if (i + 1 < kana.length && KANA_PATTERNS[kana.slice(i, i + 2)]) {
      const two = kana.slice(i, i + 2);
      segs.push({
        kanaLen: 2,
        patterns: [...KANA_PATTERNS[two]],
        display: kanaToRoman(two),
      });
      i += 2;
      continue;
    }
    if (kana[i] === "っ") {
      const nextPatterns: string[] = [];
      if (i + 1 < kana.length) {
        const nxt2 = i + 2 < kana.length ? kana.slice(i + 1, i + 3) : null;
        const nxt1 = kana[i + 1];
        const nextPats = nxt2 && KANA_PATTERNS[nxt2]
          ? KANA_PATTERNS[nxt2]
          : KANA_PATTERNS[nxt1] ?? [];
        for (const p of nextPats) {
          if (/^[bcdfghjklmnpqrstvwxyz]/.test(p)) nextPatterns.push(p[0] + p[0]);
        }
      }
      const allPats = [...new Set([...nextPatterns, "ltu", "xtu", "ltsu", "xtsu"])];
      segs.push({ kanaLen: 1, patterns: allPats, display: nextPatterns[0] ?? "xtu" });
      i++;
      continue;
    }
    if (kana[i] === "ん") {
      const nx = kana[i + 1];
      const needDouble = nx && "あいうえおなにぬねのやゆよん".includes(nx);
      if (needDouble) {
        segs.push({ kanaLen: 1, patterns: ["nn", "xn"], display: "nn" });
      } else {
        segs.push({ kanaLen: 1, patterns: ["n", "nn", "xn"], display: "n" });
      }
      i++;
      continue;
    }
    const p = KANA_PATTERNS[kana[i]];
    const dispR = kanaToRoman(kana[i]);
    segs.push({
      kanaLen: 1,
      patterns: p ? [...p] : [/^[A-Za-z]$/.test(kana[i]) ? kana[i].toLowerCase() : kana[i]],
      display: dispR || kana[i],
    });
    i++;
  }
  return segs;
}

type Engine = {
  feed: (ch: string) => "ok" | "miss" | "done";
  displayState: () => {
    done: string;
    current: string;
    remaining: string;
  };
  isDone: () => boolean;
  /** 打ち終えた(確定した)ぶんのかな文字数を返す */
  getDoneKanaCount: () => number;
  /** このノート(かな)全体の文字数を返す */
  totalKanaCount: () => number;
};

function buildInputEngine(kana: string): Engine {
  const segs = segmentKana(kana);

  let segIdx = 0;
  let patBuf = "";
  let patCands: string[] = [];
  const typedHistory: string[] = [];

  function initSeg(idx: number, prefixChar?: string) {
    segIdx = idx;
    const patterns = idx < segs.length ? [...segs[idx].patterns] : [];
    if (prefixChar) {
      patBuf = prefixChar;
      patCands = patterns.filter((p) => p.startsWith(prefixChar));
      if (patCands.length === 0) {
        patBuf = "";
        patCands = patterns;
      }
    } else {
      patBuf = "";
      patCands = patterns;
    }
  }
  initSeg(0);

  function feed(ch: string): "ok" | "miss" | "done" {
    ch = ch.toLowerCase();
    if (segIdx >= segs.length) return "done";
    const next = patBuf + ch;
    const matched = patCands.filter((p) => p.startsWith(next));
    if (matched.length === 0) return "miss";
    patBuf = next;
    patCands = matched;
    const exact = patCands.find((p) => p === patBuf);
    if (exact) {
      typedHistory[segIdx] = patBuf;
      const confirmedPat = patBuf;
      segIdx++;
      if (segIdx >= segs.length) return "done";
      const isDoubleConsonant =
        confirmedPat.length === 2 &&
        confirmedPat[0] === confirmedPat[1] &&
        !["l", "x"].includes(confirmedPat[0]);
      initSeg(segIdx, isDoubleConsonant ? confirmedPat[0] : undefined);
      return "ok";
    }
    return "ok";
  }

  function displayState() {
    let done = "";
    let current = "";
    let remaining = "";

    for (let i = 0; i < segs.length; i++) {
      if (i < segIdx) {
        const hist = typedHistory[i] || segs[i].patterns[0];
        const isDoubleConsonantDone =
          segs[i].kanaLen === 1 &&
          !["ltu", "xtu", "ltsu", "xtsu"].includes(hist) &&
          hist.length >= 2 &&
          hist[0] === hist[1];
        done += isDoubleConsonantDone ? hist[0] : hist;
      } else if (i === segIdx) {
        const preferred = patCands.reduce((a, b) => (a.length <= b.length ? a : b));
        const restSegs = segs.slice(i + 1);
        const restStr = restSegs.map((s) => s.display || s.patterns[0]).join("");
        current = patBuf.length < preferred.length ? preferred[patBuf.length] : "";
        remaining = preferred.slice(patBuf.length + 1) + restStr;
        break;
      } else {
        remaining += segs[i].display || segs[i].patterns[0];
      }
    }

    if (segIdx >= segs.length) {
      return { done, current: "", remaining: "" };
    }
    return { done, current, remaining };
  }

  function isDone() {
    return segIdx >= segs.length;
  }

  function getDoneKanaCount() {
    return segs.slice(0, segIdx).reduce((sum, s) => sum + s.kanaLen, 0);
  }

  function totalKanaCount() {
    return segs.reduce((sum, s) => sum + s.kanaLen, 0);
  }

  return { feed, displayState, isDone, getDoneKanaCount, totalKanaCount };
}

export interface UseTypingReturn {
  /** 打ち終えた部分(ローマ字) */
  typed: string;
  /** 次に打つべき1文字 */
  current: string;
  /** その後に続くローマ字 */
  remaining: string;
  /** このノートのキー入力成功数 */
  keyCount: number;
  /** このノートのミス数 */
  missCount: number;
  /** ノートを打ち切ったか */
  noteCleared: boolean;
  /** 打ち終えた(確定した)ぶんのかな文字数 */
  typedKanaCount: number;
  /** このノート(かな)全体の文字数 */
  totalKanaCount: number;
  /** 新しいひらがな文字列で判定をリセットする */
  reset: (kana: string) => void;
}

/**
 * 現在のノート(かな文字列)に対するタイピング判定を提供するフック。
 * isActive が true の間だけ keydown を拾い、ノート(kana)が変わったら
 * 自動的に判定をリセットする。
 */
export function useTyping(kana: string, isActive: boolean): UseTypingReturn {
  const engineRef = useRef<Engine | null>(null);
  const keyCountRef = useRef(0);
  const missCountRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    engineRef.current = buildInputEngine(kana);
    keyCountRef.current = 0;
    missCountRef.current = 0;
    rerender();
    // kanaが変わるたびに判定をリセットする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kana]);

  useEffect(() => {
    if (!isActive) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1) return;
      const eng = engineRef.current;
      if (!eng || eng.isDone()) return;

      const result = eng.feed(e.key);
      if (result === "miss") {
        missCountRef.current++;
        rerender();
        return;
      }
      keyCountRef.current++;
      rerender();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, rerender]);

  const eng = engineRef.current;
  const state = eng?.displayState() ?? { done: "", current: "", remaining: "" };
  const noteCleared = eng?.isDone() ?? false;
  const typedKanaCount = eng?.getDoneKanaCount() ?? 0;
  const totalKanaCount = eng?.totalKanaCount() ?? 0;

  return {
    typed: state.done,
    current: state.current,
    remaining: state.remaining,
    keyCount: keyCountRef.current,
    missCount: missCountRef.current,
    noteCleared,
    typedKanaCount,
    totalKanaCount,
    reset: (nextKana: string) => {
      engineRef.current = buildInputEngine(nextKana);
      keyCountRef.current = 0;
      missCountRef.current = 0;
      rerender();
    },
  };
}