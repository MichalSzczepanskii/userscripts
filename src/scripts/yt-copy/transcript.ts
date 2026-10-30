import { unsafeWindow } from '$';
import { languageLabel, parseJson3, pickDefaultTrack, type CaptionTracklist, type Cue, type VideoInfo } from './format';

interface PlayerResponse {
  videoDetails?: { videoId?: string; title?: string; author?: string };
  microformat?: { playerMicroformatRenderer?: { publishDate?: string } };
  captions?: { playerCaptionsTracklistRenderer?: CaptionTracklist };
}

interface YouTubeWindow {
  ytcfg?: { get(key: string): string | undefined };
}

// The IOS client returns caption URLs that work without a PO token; the web client's do not.
// shortcut: client version is hardcoded, bump it when the request starts failing.
async function fetchIosPlayer(videoId: string): Promise<PlayerResponse> {
  const key = (unsafeWindow as YouTubeWindow).ytcfg?.get('INNERTUBE_API_KEY') ?? '';
  const response = await fetch(`/youtubei/v1/player?key=${key}&prettyPrint=false`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'IOS', clientVersion: '20.10.3', hl: 'en' } }, videoId }),
  });
  if (!response.ok) throw new Error(`player ${response.status}`);
  return response.json();
}

async function fetchCues(url: string): Promise<Cue[]> {
  const u = new URL(url, location.origin);
  u.searchParams.set('fmt', 'json3');
  const text = await (await fetch(u)).text();
  return text ? parseJson3(JSON.parse(text)) : [];
}

// Fallback: reuse the timedtext URL the web player fetched itself, which carries its PO token.
async function fetchFromPlayerRequest(): Promise<{ cues: Cue[]; language?: string }> {
  const find = () =>
    unsafeWindow.performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .findLast((name) => name.includes('/api/timedtext') && name.includes(`v=${currentVideoId()}`));

  let url = find();
  const button = document.querySelector<HTMLElement>('.ytp-subtitles-button');
  if (!url && button?.getAttribute('aria-pressed') === 'false') {
    button.click();
    for (let i = 0; i < 20 && !url; i++) {
      await new Promise((r) => setTimeout(r, 150));
      url = find();
    }
    button.click();
  }
  if (!url) return { cues: [] };
  const params = new URL(url).searchParams;
  return { cues: await fetchCues(url), language: languageLabel(params.get('lang') ?? '?', params.get('kind')) };
}

export function currentVideoId(): string | null {
  return location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null;
}

export async function loadVideo(
  videoId: string,
): Promise<{ video: VideoInfo; cues: Cue[]; captionsAvailable: boolean }> {
  const player = (
    document.getElementById('movie_player') as { getPlayerResponse?(): PlayerResponse } | null
  )?.getPlayerResponse?.();
  // After SPA navigation the web player may still hold the previous video.
  const web = player?.videoDetails?.videoId === videoId ? player : undefined;

  const ios = await fetchIosPlayer(videoId).catch(() => undefined);
  const track = pickDefaultTrack(ios?.captions?.playerCaptionsTracklistRenderer);
  let cues = track ? await fetchCues(track.baseUrl).catch(() => []) : [];
  let language = track && languageLabel(track.languageCode, track.kind);

  if (!cues.length && web?.captions) ({ cues, language } = await fetchFromPlayerRequest());

  const details = web?.videoDetails ?? ios?.videoDetails;
  return {
    video: {
      id: videoId,
      title: details?.title ?? document.title.replace(/ - YouTube$/, ''),
      channel: details?.author,
      published: web?.microformat?.playerMicroformatRenderer?.publishDate,
      language: cues.length ? language : undefined,
    },
    cues,
    captionsAvailable: !!track || !!web?.captions,
  };
}
