export interface Cue {
  startMs: number;
  text: string;
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

export interface CaptionTracklist {
  captionTracks?: CaptionTrack[];
  audioTracks?: { captionTrackIndices?: number[]; defaultCaptionTrackIndex?: number }[];
  defaultAudioTrackIndex?: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  channel?: string;
  published?: string;
  language?: string;
}

/** The track YouTube itself shows by default in the transcript panel. */
export function pickDefaultTrack(tracklist: CaptionTracklist | undefined): CaptionTrack | undefined {
  const tracks = tracklist?.captionTracks ?? [];
  const audio = tracklist?.audioTracks?.[tracklist.defaultAudioTrackIndex ?? 0];
  return tracks[audio?.defaultCaptionTrackIndex ?? audio?.captionTrackIndices?.[0] ?? 0];
}

export function languageLabel(languageCode: string, kind?: string | null): string {
  return kind === 'asr' ? `${languageCode} (auto)` : languageCode;
}

/** Parses a timedtext response in `fmt=json3`. */
export function parseJson3(json: { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] }): Cue[] {
  return (json.events ?? []).flatMap((event) => {
    const text = (event.segs ?? [])
      .map((seg) => seg.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? [{ startMs: event.tStartMs ?? 0, text }] : [];
  });
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** `level` is the heading level of the title; a playlist nests videos at level 2. */
export function toMarkdown(
  video: VideoInfo,
  cues: Cue[],
  withTimestamps: boolean,
  level = 1,
  emptyNote = 'No transcript available.',
): string {
  const fields = [
    `- URL: https://www.youtube.com/watch?v=${video.id}`,
    video.channel && `- Channel: ${video.channel}`,
    video.published && `- Published: ${video.published.slice(0, 10)}`,
    video.language && `- Language: ${video.language}`,
  ].filter(Boolean);

  const transcript = !cues.length
    ? `_${emptyNote}_`
    : withTimestamps
      ? cues.map((cue) => `[${formatTime(cue.startMs)}] ${cue.text}`).join('\n')
      : cues.map((cue) => cue.text).join(' ');

  const h = '#'.repeat(level);
  return `${h} ${video.title}\n\n${fields.join('\n')}\n\n${h}# Transcript\n\n${transcript}\n`;
}

/** Toast shown after copying. Captions that exist but yield no cues mean the fetch is broken. */
export function copyMessage(hasCues: boolean, captionsAvailable: boolean, withTimestamps: boolean): string {
  if (hasCues) return withTimestamps ? 'Skopiowano (z czasem)' : 'Skopiowano';
  return captionsAvailable
    ? 'Napisy są, ale pobieranie nie działa — zaktualizuj skrypt'
    : 'Brak transkryptu, skopiowano tylko nagłówek';
}
