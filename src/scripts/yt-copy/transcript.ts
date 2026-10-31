import { unsafeWindow } from '$';
import { languageLabel, parseJson3, pickDefaultTrack, type CaptionTracklist, type Cue, type VideoInfo } from './format';
import { parsePlaylistPage, type BrowseResponse, type PlaylistVideo } from './playlist';

interface PlayerResponse {
  videoDetails?: { videoId?: string; title?: string; author?: string };
  microformat?: { playerMicroformatRenderer?: { publishDate?: string } };
  captions?: { playerCaptionsTracklistRenderer?: CaptionTracklist };
}

interface YouTubeWindow {
  ytcfg?: { get(key: string): unknown };
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

// Private playlists (WL, LL, your own) need the SAPISIDHASH header the web client sends with its cookies.
async function authHeaders(): Promise<Record<string, string>> {
  const sapisid = document.cookie.match(/(?:^|; )(?:SAPISID|__Secure-3PAPISID)=([^;]+)/)?.[1];
  if (!sapisid) return {};
  const time = Math.floor(Date.now() / 1000);
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${time} ${sapisid} ${location.origin}`));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { Authorization: `SAPISIDHASH ${time}_${hash}`, 'X-Origin': location.origin, 'X-Goog-AuthUser': '0' };
}

async function browse(body: object): Promise<BrowseResponse> {
  const ytcfg = (unsafeWindow as YouTubeWindow).ytcfg;
  const response = await fetch(`/youtubei/v1/browse?key=${ytcfg?.get('INNERTUBE_API_KEY') ?? ''}&prettyPrint=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ context: ytcfg?.get('INNERTUBE_CONTEXT'), ...body }),
  });
  if (!response.ok) throw new Error(`browse ${response.status}`);
  return response.json();
}

export function currentVideoId(): string | null {
  return location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null;
}

export function currentPlaylistId(): string | null {
  return ['/watch', '/playlist'].includes(location.pathname) ? new URLSearchParams(location.search).get('list') : null;
}

/** Every video of the playlist, following continuations page by page. */
export async function loadPlaylist(
  listId: string,
): Promise<{ id: string; title: string; channel?: string; videos: PlaylistVideo[] }> {
  let page = parsePlaylistPage(await browse({ browseId: `VL${listId}` }));
  const { title = listId, channel } = page;
  const videos = [...page.videos];
  while (page.token && page.videos.length) {
    page = parsePlaylistPage(await browse({ continuation: page.token }));
    videos.push(...page.videos);
  }
  return { id: listId, title, channel, videos };
}

export async function loadVideo(
  videoId: string,
  fallbackTitle = document.title.replace(/ - YouTube$/, ''),
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
      title: details?.title ?? fallbackTitle,
      channel: details?.author,
      published: web?.microformat?.playerMicroformatRenderer?.publishDate,
      language: cues.length ? language : undefined,
    },
    cues,
    captionsAvailable: !!track || !!web?.captions,
  };
}
