let el: HTMLDivElement | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Small message in the bottom-right corner. Pass `sticky` to keep it until the next call. */
export function toast(message: string, sticky = false): void {
  if (!el) {
    el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border-radius:8px;' +
      'background:#222;color:#fff;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3)';
  }
  document.body.append(el);
  el.textContent = message;
  clearTimeout(timer);
  if (!sticky) timer = setTimeout(() => el?.remove(), 2000);
}
