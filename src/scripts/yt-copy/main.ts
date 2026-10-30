import { GM_registerMenuCommand, GM_setClipboard } from '$';
import { toast } from '../../lib/toast';
import { toMarkdown } from './format';
import { currentVideoId, loadVideo } from './transcript';

async function copy(withTimestamps: boolean) {
  const videoId = currentVideoId();
  if (!videoId) return toast('To nie jest strona filmu');
  toast('Pobieram transkrypt…', true);
  try {
    const { video, cues } = await loadVideo(videoId);
    GM_setClipboard(toMarkdown(video, cues, withTimestamps), 'text');
    toast(
      !cues.length
        ? 'Brak transkryptu, skopiowano tylko nagłówek'
        : withTimestamps
          ? 'Skopiowano (z czasem)'
          : 'Skopiowano',
    );
  } catch (error) {
    toast(`Błąd: ${error instanceof Error ? error.message : error}`);
  }
}

GM_registerMenuCommand('Kopiuj link + transkrypt', () => copy(false));
GM_registerMenuCommand('Kopiuj link + transkrypt (z czasem)', () => copy(true));

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
