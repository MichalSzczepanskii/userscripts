import { videoIdFromHref } from './format';

// shortcut: tied to YouTube's current markup, the item silently disappears when it changes.
const TILES = [
  'yt-lockup-view-model',
  'ytm-shorts-lockup-view-model',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-playlist-video-renderer',
  'ytd-playlist-panel-video-renderer',
].join(',');
const LABEL = 'Kopiuj transkrypt';

function copyIcon(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute(
    'd',
    'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  );
  svg.append(path);
  return svg;
}

// The new menu (yt-list-view-model) survives cloning; the old Polymer one re-renders a clone empty, so it gets a plain item.
function menuItem(list: Element): HTMLElement {
  const native = list.querySelector('yt-list-item-view-model');
  if (native) {
    const item = native.cloneNode(true) as HTMLElement;
    item.querySelector('[role=text]')!.textContent = LABEL;
    // YouTube adds the hover class and loads the icon's SVG from JS, so the clone may have neither.
    item.querySelector('.ytListItemViewModelHovered')?.classList.remove('ytListItemViewModelHovered');
    item.querySelector('.ytListItemViewModelTappable')?.classList.add('ytListItemViewModelTappableHover');
    item.querySelector('[role=img]')?.replaceChildren(copyIcon());
    return item;
  }
  const item = document.createElement('div');
  item.setAttribute('role', 'menuitem');
  item.style.cssText =
    'display:flex;align-items:center;gap:12px;height:36px;padding:0 12px 0 16px;cursor:pointer;' +
    'font:14px/20px Roboto,Arial,sans-serif;color:var(--yt-spec-text-primary)';
  item.onmouseenter = () => (item.style.background = 'var(--yt-spec-10-percent-layer)');
  item.onmouseleave = () => (item.style.background = '');
  item.append(copyIcon(), LABEL);
  return item;
}

function openMenu(): { dropdown: Element; list: Element } | undefined {
  const dropdown = [...document.querySelectorAll('tp-yt-iron-dropdown')].find(
    (dropdown) => getComputedStyle(dropdown).display !== 'none',
  );
  const list = dropdown?.querySelector('yt-list-view-model, tp-yt-paper-listbox#items');
  return dropdown && list ? { dropdown, list } : undefined;
}

/** Adds "Kopiuj transkrypt" to the ⋮ menu of video tiles; Shift+click copies with timestamps. */
export function addTileMenuItem(onCopy: (videoId: string, title: string | undefined, withTimestamps: boolean) => void) {
  window.addEventListener(
    'click',
    async (event) => {
      const target = event.target as Element;
      if (target.closest('[data-yt-copy]')) return;
      // Menus are reused across tiles, so an item left from the last one would copy the wrong video.
      document.querySelectorAll('[data-yt-copy]').forEach((item) => item.remove());

      const tile = target.closest(TILES);
      if (!tile || tile.querySelector('yt-collection-thumbnail-view-model')) return; // mixes and playlists
      const href = tile.querySelector('a[href*="/watch?v="], a[href^="/shorts/"]')?.getAttribute('href');
      const videoId = href && videoIdFromHref(href);
      if (!videoId) return;
      const title = tile.querySelector('h3, #video-title')?.textContent?.trim() || undefined;

      // The menu opens a moment after the click; give up after ~1 s if this click was not on ⋮.
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const menu = openMenu();
        if (!menu) continue;
        const item = menuItem(menu.list);
        item.dataset.ytCopy = '';
        item.addEventListener('click', (click) => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
          onCopy(videoId, title, click.shiftKey);
        });
        menu.list.prepend(item);
        // The dropdown sized itself before the item was added; without a refit it clips the last entry.
        (menu.dropdown as Element & { refit?(): void }).refit?.();
        return;
      }
    },
    true,
  );
}
