export interface LyricsNote {
  id: string;
  text: string;
  kana: string;
  start: number;
  end: number;
}

export interface LyricsLine {
  id: string;
  notes: LyricsNote[];
}

export interface LyricsData {
  meta: {
    title: string;
    timeRatio: number;
  };
  lines: LyricsLine[];
}