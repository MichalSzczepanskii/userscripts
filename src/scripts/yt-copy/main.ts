import { GM_registerMenuCommand, GM_setClipboard } from '$';
import { toast } from '../../lib/toast';
import { copyMessage, toMarkdown } from './format';
import { playlistFilename, playlistMarkdown, playlistMessage } from './playlist';
import { currentPlaylistId, currentVideoId, loadPlaylist, loadVideo } from './transcript';

async function copy(withTimestamps: boolean) {
  const videoId = currentVideoId();
  if (!videoId) return toast('To nie jest strona filmu');
  toast('Pobieram transkrypt…', true);
  try {
    const { video, cues, captionsAvailable } = await loadVideo(videoId);
    GM_setClipboard(toMarkdown(video, cues, withTimestamps), 'text');
    toast(copyMessage(cues.length > 0, captionsAvailable, withTimestamps));
  } catch (error) {
    toast(`Błąd: ${error instanceof Error ? error.message : error}`);
  }
}

function download(filename: string, text: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function downloadPlaylist(withTimestamps: boolean) {
  const listId = currentPlaylistId();
  if (!listId) return toast('To nie jest playlista');
  if (listId.startsWith('RD')) return toast('Miksy nie są obsługiwane');
  toast('Pobieram listę filmów…', true);
  try {
    const playlist = await loadPlaylist(listId);
    const total = playlist.videos.length;
    if (total > 200 && !confirm(`Playlista ma ${total} filmów, ok. ${Math.ceil(total / 60)} min. Kontynuować?`)) {
      return toast('Anulowano');
    }
    // One video at a time, so a long playlist does not trip YouTube's rate limit.
    const sections: string[] = [];
    let missing = 0;
    for (const [i, { id, title }] of playlist.videos.entries()) {
      toast(`Pobieram ${i + 1}/${total}…`, true);
      const result = await loadVideo(id, title).catch(() => undefined);
      if (!result?.cues.length) missing++;
      const note = !result || result.captionsAvailable ? 'Transcript fetch failed.' : undefined;
      sections.push(toMarkdown(result?.video ?? { id, title }, result?.cues ?? [], withTimestamps, 2, note));
    }
    download(playlistFilename(playlist.title, withTimestamps), playlistMarkdown(playlist, sections));
    toast(playlistMessage(total, missing));
  } catch (error) {
    toast(`Błąd: ${error instanceof Error ? error.message : error}`);
  }
}

GM_registerMenuCommand('Kopiuj link + transkrypt', () => copy(false));
GM_registerMenuCommand('Kopiuj link + transkrypt (z czasem)', () => copy(true));
GM_registerMenuCommand('Pobierz transkrypt playlisty (.md)', () => downloadPlaylist(false));
GM_registerMenuCommand('Pobierz transkrypt playlisty (.md, z czasem)', () => downloadPlaylist(true));

window.addEventListener(
  'keydown',
  (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.code !== 'KeyC') return;
    const target = event.target as HTMLElement;
    if (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
    event.preventDefault();
    copy(event.shiftKey);
  },
  true,
);
