// ==UserScript==
// @name         nextHunter
// @namespace    https://github.com/luckylukam/newHunter
// @version      1.3.0
// @description  pure-JS hentai reader for e-hentai/exhentai/nhentai.
// @author       you
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @match        *://nhentai.net/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";
  const THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
:root {
  --r-bg:        #0d0d0f;
  --r-bg-alt:    #131318;
  --r-bg-glass:  rgba(13, 13, 15, 0.88);
  --r-fg:        #e8e3d8;
  --r-fg-dim:    rgba(232, 227, 216, 0.45);
  --r-accent:    #c9963a;
  --r-accent-lo: rgba(201, 150, 58, 0.18);
  --r-border:    rgba(255, 255, 255, 0.08);
  --r-red:       #e05858;
  --r-red-lo:    rgba(224, 88, 88, 0.15);
  --r-green:     #4fb86a;
  --r-radius:    6px;
  --r-font:      -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --r-bar-h:     44px;
}
/* ---- root shell ---- */
#ehunter-js-root {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: var(--r-bg);
  color: var(--r-fg);
  font: 13px/1.5 var(--r-font);
  display: flex;
  flex-direction: column;
}
/* ---- top bar ---- */
.r-topbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  height: var(--r-bar-h);
  flex-shrink: 0;
  background: var(--r-bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--r-border);
  z-index: 10;
  transition: margin-top 0.22s ease, opacity 0.22s ease;
}
/* Slide the bar up by its own height — negative margin collapses it out of flow
   without reflowing the scroll content (the scroller fills the gap). */
#ehunter-js-root.r-bar-hidden .r-topbar {
  margin-top: calc(-1 * var(--r-bar-h));
  opacity: 0;
  pointer-events: none;
}
.r-topbar__title {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 26vw;
  opacity: 0.85;
  margin-right: 4px;
}
.r-topbar__sep {
  width: 1px;
  height: 18px;
  background: var(--r-border);
  flex-shrink: 0;
  margin: 0 2px;
}
.r-topbar__page {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--r-fg-dim);
  white-space: nowrap;
}
.r-progressbar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--r-accent);
  transition: width 0.3s ease;
  pointer-events: none;
}
/* ---- buttons ---- */
.r-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  color: var(--r-fg-dim);
  border: 1px solid transparent;
  border-radius: var(--r-radius);
  padding: 5px 9px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.r-btn:hover, .r-btn:focus-visible {
  color: var(--r-fg);
  border-color: var(--r-border);
  background: rgba(255,255,255,0.05);
  outline: none;
}
.r-btn--active {
  color: var(--r-accent);
  border-color: var(--r-accent);
  background: var(--r-accent-lo);
}
.r-btn--close:hover {
  color: var(--r-red);
  border-color: var(--r-red);
  background: var(--r-red-lo);
}
.r-btn svg { flex-shrink: 0; }
/* ---- body + layout ---- */
.r-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
/* ---- scroll mode ---- */
.r-scrollmode {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  scroll-behavior: smooth;
}
/* ---- page wrapper (shared by scroll + book) ---- */
/* NOTE: min-height on unloaded pages stops the container from collapsing while the
   blurred thumb preview is showing. Once loaded the image's intrinsic size drives
   layout, so min-height drops to 0 — this prevents the large empty gap that appears
   when zooming out (CSS zoom shrinks the content but vh-based min-height stays fixed
   in viewport units, creating dead space between images). */
.r-page {
  position: relative;
  max-width: 100%;
  width: 100%;          /* scroll mode: fill column so it never collapses horizontally */
  min-height: 400px;    /* px (not vh) so CSS zoom scales it down — vh is viewport-relative
                           and stays large even when content is zoomed out, creating gaps */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* No aspect-ratio in transition — animating it causes intermediate wrong sizes = visible gaps */
  transition: width 0.25s ease, min-width 0.25s ease, min-height 0.25s ease;
}
/* Once loaded, drop min-height entirely — the image's intrinsic height drives layout.
   This removes the gap that appears at low zoom levels. */
.r-page--loaded { min-height: 0; }
.r-page--book {
  max-height: 100%;
  width: 42vw;          /* book mode: hard floor — prevents collapse before image loads */
  min-width: 42vw;
  min-height: 55vh;
}
.r-page--book.r-page--loaded { width: auto; min-width: 0; min-height: 0; }
/* spinner on loading pages */
.r-page--loading::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--r-border);
  border-top-color: var(--r-accent);
  animation: r-spin 0.7s linear infinite;
  pointer-events: none;
}
.r-page--failed { border: 1px dashed rgba(224,88,88,0.4); cursor: pointer; }
/* images */
.r-page-img {
  position: relative;
  z-index: 1;           /* above placeholder so partial paints show through */
  width: 100%;          /* fill the column — lets the image's natural aspect ratio drive height */
  height: auto;         /* intrinsic height: no explicit height means no layout collapse */
  max-width: 100%;
  display: block;
  opacity: 0;
  pointer-events: none; /* pass clicks through to placeholder actions while invisible */
  transition: opacity 0.25s ease;
}
.r-page--loading .r-page-img { opacity: 1; }
.r-page-img--loaded { opacity: 1; pointer-events: auto; }
.r-page-img--book { width: auto; max-height: 92vh; }
/* zoom applied via JS: --r-zoom CSS variable.
   We control zoom via max-width on .r-page rather than CSS zoom on the scroller.
   CSS zoom on the scroller conflicts with width:100% on images — the image always
   fills 100% of the zoomed container so it looks unchanged. Instead, we shrink the
   page wrapper's max-width, which limits the column width so width:100% images
   actually render smaller. Book mode keeps CSS zoom since it uses fixed vh sizing. */
.r-scrollmode .r-page { max-width: calc(var(--r-zoom, 1) * 100%); }
.r-bookmode            { zoom: var(--r-zoom, 1); }
/* ---- HD badge ---- */
.r-hd-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  background: rgba(0,0,0,0.6);
  color: var(--r-fg-dim);
  border: 1px solid var(--r-border);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.r-page:hover .r-hd-btn { opacity: 0.8; }
.r-hd-btn:hover { opacity: 1 !important; color: var(--r-accent); border-color: var(--r-accent); }
.r-hd-btn--active { opacity: 1 !important; color: var(--r-accent); border-color: var(--r-accent); background: var(--r-accent-lo); }
/* ---- placeholder (shown until image loads) ---- */
.r-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  z-index: 0;           /* behind img (z-index:1) so partial paints show through */
  pointer-events: none;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
}
.r-page--loaded .r-placeholder { display: none; }
/* blurry thumb shown behind loading status */
.r-placeholder__thumb-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  filter: blur(12px) brightness(0.45);
  z-index: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 2px;
  /* background-image/size/position are set entirely by JS (sprite math or plain cover) */
  background-repeat: no-repeat;
}
.r-placeholder__thumb-bg--visible { opacity: 1; }
.r-placeholder__num,
.r-placeholder__status,
.r-placeholder__actions { position: relative; z-index: 1; }
.r-placeholder__num {
  font-family: 'Cinzel', serif;
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  color: var(--r-fg);
  opacity: 0.06;
  letter-spacing: -0.02em;
  user-select: none;
}
.r-placeholder__status {
  font-size: 11px;
  color: var(--r-fg-dim);
  letter-spacing: 0.02em;
}
.r-page--failed .r-placeholder__status { color: #ff8080; opacity: 1; }
.r-placeholder__actions {
  display: flex;
  gap: 12px;
  pointer-events: all;
}
.r-placeholder__action {
  color: var(--r-accent);
  cursor: pointer;
  font-size: 11px;
  opacity: 0.85;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: opacity 0.15s, border-color 0.15s;
}
.r-placeholder__action:hover { opacity: 1; border-color: var(--r-accent); }
/* ---- book mode ---- */
.r-bookmode {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  overflow: hidden;
}
.r-clickzone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 30%;
  cursor: pointer;
  z-index: 3;
}
.r-clickzone--left  { left: 0; }
.r-clickzone--right { right: 0; }
/* ---- thumbnail sidebar ---- */
.r-thumbbar {
  display: none;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding: 8px 6px;
  width: 96px;
  background: var(--r-bg-alt);
  border-left: 1px solid var(--r-border);
  flex-shrink: 0;
}
.r-thumb-wrap {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  background: var(--r-bg);
  border: 1.5px solid transparent;
  transition: border-color 0.15s;
}
.r-thumb-wrap--active { border-color: var(--r-accent); }
.r-thumb-wrap:hover:not(.r-thumb-wrap--active) { border-color: var(--r-border); }
.r-thumb {
  position: relative;
  overflow: hidden;
  width: 100%;
  /* aspect-ratio is set per-thumb in JS from the actual sprite crop / image dimensions
     (paintThumb injects it once the probe image loads).  Fall back to 2/3 (manga default)
     only until the real value is known — overridden inline once the thumb loads. */
  aspect-ratio: 2/3;
  display: block;
  object-fit: cover;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.r-thumb-wrap--active .r-thumb,
.r-thumb-wrap:hover .r-thumb { opacity: 1; }
.r-thumb--shimmer {
  background: linear-gradient(90deg, var(--r-bg) 25%, var(--r-bg-alt) 50%, var(--r-bg) 75%);
  background-size: 200% 100%;
  animation: r-shimmer 1.4s ease infinite;
}
.r-thumb--missing {
  border-color: rgba(224,88,88,0.3) !important;
  background: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(224,88,88,0.08) 5px, rgba(224,88,88,0.08) 10px);
}
.r-thumb-badge {
  position: absolute;
  bottom: 3px;
  right: 4px;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  color: rgba(255,255,255,0.6);
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
  pointer-events: none;
}
/* ---- toast ---- */
.r-toast {
  position: fixed;
  top: calc(var(--r-bar-h) + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  padding: 7px 16px;
  border-radius: var(--r-radius);
  background: var(--r-bg-alt);
  border: 1px solid var(--r-border);
  color: var(--r-fg);
  font-size: 12px;
  z-index: 1000000;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
}
.r-toast--visible { opacity: 1; transform: translateX(-50%) translateY(0); }
.r-toast--error  { border-color: var(--r-red); color: #ff9090; }
.r-toast--success { border-color: var(--r-green); color: #80e898; }
/* ---- dialog ---- */
.r-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.r-dialog {
  position: relative;
  background: var(--r-bg-alt);
  border: 1px solid var(--r-border);
  border-radius: 10px;
  padding: 22px 24px;
  min-width: 280px;
  max-width: 400px;
  width: 90vw;
}
.r-dialog__title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--r-border);
}
.r-dialog__close {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 8px;
  font-size: 14px;
}
/* ---- settings ---- */
.r-settings { display: flex; flex-direction: column; gap: 14px; }
.r-settings__num-input {
  background: rgba(255,255,255,0.06);
  color: var(--r-fg);
  border: 1px solid var(--r-border);
  border-radius: var(--r-radius);
  padding: 4px 8px;
  font: inherit;
  font-size: 12px;
  width: 64px;
  text-align: center;
}
.r-settings__label {
  font-size: 12px;
  color: var(--r-fg-dim);
  display: block;
  margin-bottom: 5px;
}
.r-settings__hint {
  font-size: 11px;
  color: var(--r-fg-dim);
  line-height: 1.5;
  margin-top: -6px;
}
.r-settings__shortcut-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 11px;
}
.r-settings__key {
  font-family: monospace;
  background: rgba(255,255,255,0.07);
  border: 1px solid var(--r-border);
  border-radius: 3px;
  padding: 1px 5px;
  color: var(--r-fg);
  text-align: center;
}
.r-settings__key-desc { color: var(--r-fg-dim); align-self: center; }
/* switch row */
.r-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}
.r-switch { position: relative; display: inline-block; width: 32px; height: 18px; flex: none; }
.r-switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; z-index: 1; }
.r-switch__track {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
  transition: background 0.15s;
}
.r-switch__track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--r-fg);
  transition: transform 0.15s;
}
.r-switch input:checked + .r-switch__track { background: var(--r-accent); }
.r-switch input:checked + .r-switch__track::after { transform: translateX(14px); }
/* select */
.r-select {
  background: rgba(255,255,255,0.06);
  color: var(--r-fg);
  border: 1px solid var(--r-border);
  border-radius: var(--r-radius);
  padding: 5px 8px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  width: 100%;
}
.r-select:focus { outline: 1px solid var(--r-accent); }
/* ---- boot overlay ---- */
.r-boot {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: var(--r-bg);
  color: var(--r-fg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font: 13px/1.5 var(--r-font);
}
.r-boot__ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2.5px solid var(--r-border);
  border-top-color: var(--r-accent);
  animation: r-spin 0.75s linear infinite;
}
.r-boot__label { color: var(--r-fg-dim); font-size: 12px; }
.r-boot--error .r-boot__label { color: var(--r-red); opacity: 1; max-width: 300px; text-align: center; }
/* ---- keyframes ---- */
@keyframes r-spin    { to { transform: rotate(360deg); } }
@keyframes r-shimmer { to { background-position: -200% 0; } }
`;
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = THEME_CSS;
    document.head.appendChild(s);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  function icon(path, size = 14) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = path;
    return svg;
  }
  const ICONS = {
    scroll:    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    book:      '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    thumbs:    '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    zoomIn:    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
    zoomOut:   '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
    download:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    settings:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    close:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  };
  const CONFIG = {
    rootId: 'ehunter-js-root',
    defaultMode: 'scroll',
    defaultZoom: 1,
    defaultLang: 'en',
    defaultHighRes: false,
    thumbnailWidth: 96,
    prefetchAhead: 2,
    gridLookahead: 8,
    retry: { maxAttempts: 6, baseDelayMs: 800 },
    requestTimeoutMs: 45000,
    imageTimeoutMs:   60000,
    autoRetryDelay:   8000,
    storageKeys: { layoutPreference: 'ehunter-js:layout-preference' },
    defaultInitialForward:  3,
    defaultInitialBackward: 1,
    defaultPreloadForward:  15,
    defaultPreloadBackward: 5,
  };
  const Storage = {
    get(key, fallback) {
      try {
        if (typeof GM_getValue === 'function') {
          const v = GM_getValue(key);
          return v === undefined ? fallback : v;
        }
      } catch {   }
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; }
      } catch {   }
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {   }
    },
  };
  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const key in attrs) {
      const value = attrs[key];
      if (key === 'class') el.className = value;
      else if (key === 'style') Object.assign(el.style, value);
      else if (key.startsWith('on') && typeof value === 'function')
        el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== null && value !== undefined)
        el.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      if (child == null) continue;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return el;
  }
  function clear(el) { el.replaceChildren(); }
  class EventBus {
    constructor() { this._m = new Map(); }
    on(ev, fn) {
      if (!this._m.has(ev)) this._m.set(ev, new Set());
      this._m.get(ev).add(fn);
      return () => this._m.get(ev)?.delete(fn);
    }
    emit(ev, d) { this._m.get(ev)?.forEach(fn => fn(d)); }
  }
  const DICTS = {
    en: { scrollMode:'Scroll', bookMode:'Book', thumbnails:'Thumbnails', download:'Download', settings:'Settings', close:'Close', zoomIn:'Zoom in', zoomOut:'Zoom out', page:'Page' },
    zh: { scrollMode:'滚动', bookMode:'书本', thumbnails:'缩略图', download:'下载', settings:'设置', close:'关闭', zoomIn:'放大', zoomOut:'缩小', page:'页' },
    jp: { scrollMode:'スクロール', bookMode:'ブック', thumbnails:'サムネ', download:'ダウンロード', settings:'設定', close:'閉じる', zoomIn:'拡大', zoomOut:'縮小', page:'ページ' },
  };
  class I18n {
    constructor(lang = CONFIG.defaultLang) { this.lang = lang; }
    setLang(lang) { if (DICTS[lang]) this.lang = lang; }
    t(key) { return DICTS[this.lang]?.[key] ?? DICTS.en[key] ?? key; }
  }
  class LayoutPreference {
    constructor() {
      const defaults = {
        mode: CONFIG.defaultMode, zoom: CONFIG.defaultZoom, lang: CONFIG.defaultLang, rtl: true, highRes: CONFIG.defaultHighRes,
        initialForward:  CONFIG.defaultInitialForward,
        initialBackward: CONFIG.defaultInitialBackward,
        preloadForward:  CONFIG.defaultPreloadForward,
        preloadBackward: CONFIG.defaultPreloadBackward,
      };
      this.data = { ...defaults, ...Storage.get(CONFIG.storageKeys.layoutPreference, {}) };
    }
    save(patch) {
      this.data = { ...this.data, ...patch };
      Storage.set(CONFIG.storageKeys.layoutPreference, this.data);
    }
  }
  class AppState {
    constructor(bus, pref) {
      this.bus  = bus;
      this.pref = pref;
      const p = pref.data;
      this.album = { title: '', pages: [] };
      this.mode = p.mode;
      this.zoom = p.zoom;
      this.rtl = p.rtl;
      this.currentPage = 0;
      this.thumbVisible = false;
      this.highRes = !!p.highRes;
      this.highResPages = new Set();
      this.isLoadingAlbum = true;
    }
    _emit() { this.bus.emit('state:changed', this); }
    setMode(m)           { this.mode = m;                            this.pref.save({ mode: m });          this._emit(); }
    setZoom(z, maxZoom)  {
      const cap = (maxZoom != null && maxZoom > 0) ? maxZoom : 3;
      this.zoom = Math.round(Math.min(cap, Math.max(0.25, z)) * 100) / 100;
      this.pref.save({ zoom: this.zoom });
      this._emit();
    }
    setCurrentPage(i)    { this.currentPage = Math.min(Math.max(0,i), this.album.pages.length-1); this._emit(); }
    toggleThumbnails()   { this.thumbVisible = !this.thumbVisible;   this._emit(); }
    setAlbum(a)          { this.album = a;                           this._emit(); }
    setLoadingAlbum(v)   { this.isLoadingAlbum = v;                  this._emit(); }
    setHighRes(on)       {
      this.highRes = on;
      if (!on) this.highResPages.clear();
      this.pref.save({ highRes: on });
      this._emit();
    }
    setHighResForPage(i, on) { on ? this.highResPages.add(i) : this.highResPages.delete(i); this._emit(); }
    isHighResPage(i)     { return this.highResPages.has(i) || this.highRes; }
  }
  function computeBookSpreads(pageCount, rtl = true) {
    const spreads = [];
    if (!pageCount) return spreads;
    spreads.push([0]);
    for (let i = 1; i < pageCount; i += 2) {
      const hasSecond = i + 1 < pageCount;
      spreads.push(rtl && hasSecond ? [i + 1, i] : hasSecond ? [i, i + 1] : [i]);
    }
    return spreads;
  }
  async function fetchText(url, opts = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs);
    try {
      const res = await fetch(url, { credentials: 'include', ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.text();
    } catch (err) {
      if (err?.name === 'AbortError') throw new Error(`Timed out after ${CONFIG.requestTimeoutMs}ms: ${url}`);
      throw err;
    } finally {
      clearTimeout(t);
    }
  }
  async function fetchDoc(url, opts = {}) {
    return new DOMParser().parseFromString(await fetchText(url, opts), 'text/html');
  }
  function politeDelay(ms) { return new Promise(r => setTimeout(r, ms)); }
  async function withRetry(fn, { maxAttempts, baseDelayMs } = CONFIG.retry) {
    let last;
    for (let a = 1; a <= maxAttempts; a++) {
      try { return await fn(a); }
      catch (err) {
        last = err;
        if (a < maxAttempts) await new Promise(r => setTimeout(r, baseDelayMs * 2 ** (a - 1) + Math.random() * baseDelayMs));
      }
    }
    throw last;
  }
  class TaskQueue {
    constructor(concurrency = 3) {
      this.concurrency = concurrency;
      this.running = 0;
      this._high = [];
      this._low  = [];
    }
    push(task, { priority = 0 } = {}) {
      return new Promise((resolve, reject) => {
        const item = { task, resolve, reject };
        if (priority >= 10) this._high.push(item);
        else                this._low.push(item);
        this._drain();
      });
    }
    _drain() {
      while (this.running < this.concurrency && (this._high.length || this._low.length)) {
        const { task, resolve, reject } = this._high.length ? this._high.shift() : this._low.shift();
        this.running++;
        Promise.resolve().then(task).then(resolve, reject).finally(() => { this.running--; this._drain(); });
      }
    }
  }
  class AlbumService {
    constructor(platformService) {
      this.ps = platformService;
      this.queue = new TaskQueue(3);
      this.sourceCache = new Map();
      this.meta = null;
    }
    async loadAlbum(prefetchedMeta) {
      const meta = prefetchedMeta ?? await this.ps.fetchMeta();
      this.meta = meta;
      const count = meta.pageCount ?? meta.pageLinks?.length ?? 0;
      const pages = Array.from({ length: count }, (_, i) => ({
        index: i,
        pageUrl: meta.pageLinks?.[i] ?? null,
        thumb: meta.thumbLinks?.[i] ?? null,
        thumbStyle: null,
        imageUrl: null,
        loaded: false,
        loading: false,
      }));
      return { title: meta.title, pages, supportsHD: meta.supportsHD !== false };
    }
    async resolvePageUrl(page) {
      if (!page.pageUrl && this.meta?.getPageLink) page.pageUrl = await this.meta.getPageLink(page.index);
      return page.pageUrl;
    }
    async resolveThumb(page) {
      if (!page.thumb && this.meta?.getThumbLink) {
        const data = await this.meta.getThumbLink(page.index);
        if (data && typeof data === 'object') {
          page.thumb = data.url ?? null;
          page.thumbStyle = data.offsetX != null
            ? { offsetX: data.offsetX, offsetY: data.offsetY, width: data.width, height: data.height }
            : null;
        } else {
          page.thumb = data ?? null;
        }
      }
      return page.thumb;
    }
    _cacheKey(index, highRes) { return `${index}:${highRes ? 'hi' : 'lo'}`; }
    async getPageSources(page, { highRes = false, priority = 0 } = {}) {
      const key = this._cacheKey(page.index, highRes);
      if (this.sourceCache.has(key)) return this.sourceCache.get(key);
      const pageUrl = await this.resolvePageUrl(page);
      if (!pageUrl) return [];
      const sources = await this.queue.push(
        () => withRetry(() => this.ps.fetchPageImageSources(page, pageUrl, { highRes }), CONFIG.retry),
        { priority }
      );
      const list = (sources ?? []).filter(Boolean);
      this.sourceCache.set(key, list);
      return list;
    }
    async reloadPageSources(page, opts) {
      this.sourceCache.delete(this._cacheKey(page.index, !!opts?.highRes));
      return this.getPageSources(page, opts);
    }
  }
  function createPreloadEngine(albumService, pref, isHighResPage) {
    const sourcesQueued = new Set();
    const imagesQueued  = new Set();
    let imageSlots = 0;
    const IMAGE_CONCURRENCY = 6;
    const imageQueue = [];
    let imageQueueHead = 0;
    let initialBurstDone = false;
    let _cfgCache = null;
    let _cfgPrefData = null;
    function cfg() {
      const d = pref.data;
      if (_cfgCache && _cfgPrefData === d) return _cfgCache;
      _cfgPrefData = d;
      _cfgCache = {
        initFwd:  Math.max(0, d.initialForward  ?? CONFIG.defaultInitialForward),
        initBwd:  Math.max(0, d.initialBackward ?? CONFIG.defaultInitialBackward),
        fwd:      Math.max(0, d.preloadForward  ?? CONFIG.defaultPreloadForward),
        bwd:      Math.max(0, d.preloadBackward ?? CONFIG.defaultPreloadBackward),
      };
      return _cfgCache;
    }
    function _qkey(idx, highRes) { return `${idx}:${highRes ? 'hi' : 'lo'}`; }
    function drainImages() {
      while (imageSlots < IMAGE_CONCURRENCY && imageQueueHead < imageQueue.length) {
        const item = imageQueue[imageQueueHead++];
        imageSlots++;
        _loadImageIntoCache(item.page, item.url, item.highRes).finally(() => {
          imageSlots--;
          drainImages();
        });
      }
      // Compact the consumed portion of the queue once more than half is dead,
      // done outside the loop so the current iteration's item is never affected.
      if (imageQueueHead > 64 && imageQueueHead > imageQueue.length >> 1) {
        imageQueue.splice(0, imageQueueHead);
        imageQueueHead = 0;
      }
    }
    function _loadImageIntoCache(page, url, highRes) {
      return new Promise(resolve => {
        if (page.loaded && (page.loadedAsHD === !!highRes || !highRes)) { resolve(); return; }
        const tokenAtStart = page.cacheToken ?? 0;
        const img = new Image();
        const tid = setTimeout(() => { img.src = ''; resolve(); }, CONFIG.imageTimeoutMs);
        img.onload  = () => {
          clearTimeout(tid);
          if (!page.loaded && (page.cacheToken ?? 0) === tokenAtStart) {
            page.loaded      = true;
            page.imageUrl    = url;
            page.loadedAsHD  = !!highRes;
          }
          resolve();
        };
        img.onerror = () => { clearTimeout(tid); resolve(); };
        img.src = url;
      });
    }
    function enqueue(pages, idx) {
      if (idx < 0 || idx >= pages.length) return;
      const page = pages[idx];
      if (!page) return;
      const highRes = !!(isHighResPage?.(idx));
      const qk = _qkey(idx, highRes);
      if (page.loaded && (page.loadedAsHD === highRes || !highRes)) return;
      if (!sourcesQueued.has(qk)) {
        sourcesQueued.add(qk);
        albumService.getPageSources(page, { highRes, priority: 0 }).then(sources => {
          const url = sources?.[0];
          if (!url || imagesQueued.has(qk)) return;
          if (page.loaded && (page.loadedAsHD === highRes || (highRes && page.loadedAsHD))) return;
          imagesQueued.add(qk);
          imageQueue.push({ page, url, highRes });
          drainImages();
        }).catch(() => {});
      }
    }
    function expandWindow(pages, center) {
      const { fwd, bwd } = cfg();
      for (let i = center; i <= Math.min(pages.length - 1, center + fwd); i++) enqueue(pages, i);
      for (let i = Math.max(0, center - bwd); i < center; i++) enqueue(pages, i);
    }
    function onAlbumReady(pages, startIndex = 0) {
      const { initFwd, initBwd } = cfg();
      for (let i = startIndex; i <= Math.min(pages.length - 1, startIndex + initFwd - 1); i++) enqueue(pages, i);
      for (let i = Math.max(0, startIndex - initBwd); i < startIndex; i++) enqueue(pages, i);
      setTimeout(() => expandWindow(pages, startIndex), 100);
      initialBurstDone = true;
    }
    function onPageVisible(pages, index) {
      imagesQueued.delete(_qkey(index, true));
      imagesQueued.delete(_qkey(index, false));
      if (!initialBurstDone) onAlbumReady(pages, index);
      else expandWindow(pages, index);
    }
    function reset() {
      sourcesQueued.clear();
      imagesQueued.clear();
      imageQueue.length = 0;
      imageQueueHead = 0;
      initialBurstDone = false;
      _cfgCache = null;
      _cfgPrefData = null;
    }
    function cancelPage(idx) {
      sourcesQueued.delete(_qkey(idx, true));
      sourcesQueued.delete(_qkey(idx, false));
      imagesQueued.delete(_qkey(idx, true));
      imagesQueued.delete(_qkey(idx, false));
      // Single-pass filter on the live portion of the queue — avoids repeated
      // splice(i,1) which shifts the array tail on every removed entry.
      if (imageQueueHead < imageQueue.length) {
        const kept = imageQueue.slice(imageQueueHead).filter(item => item.page.index !== idx);
        imageQueue.splice(imageQueueHead, imageQueue.length - imageQueueHead, ...kept);
      }
    }
    return { onAlbumReady, onPageVisible, reset, cancelPage };
  }
  const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  let _jszipPromise = null;
  function getGlobal() {
    try { if (typeof unsafeWindow !== 'undefined') return unsafeWindow; } catch {   }
    return window;
  }
  function loadJSZip() {
    const g = getGlobal();
    if (g.JSZip) return Promise.resolve(g.JSZip);
    if (_jszipPromise) return _jszipPromise;
    _jszipPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = JSZIP_CDN;
      s.onload = () => res(getGlobal().JSZip);
      s.onerror = () => rej(new Error('JSZip CDN load failed'));
      document.head.appendChild(s);
    });
    return _jszipPromise;
  }
  async function fetchImageBlob(url, imgEls) {
    const _imgEls = imgEls ?? document.querySelectorAll('img.r-page-img');
    for (const img of _imgEls) {
      if (img.src === url && img.complete && img.naturalWidth) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const blob = await new Promise((res, rej) =>
            canvas.toBlob(b => b && b.size > 0 ? res(b) : rej(new Error('toBlob empty')), 'image/png')
          );
          canvas.width = canvas.height = 0; // release GPU/memory backing store early
          return { blob, fromCache: true };
        } catch {   }
      }
    }
    if (typeof GM_xmlhttpRequest === 'function') {
      const blob = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          responseType: 'blob',
          anonymous: false,
          onload: r => {
            if (r.status >= 200 && r.status < 300 && r.response?.size > 0) {
              resolve(r.response);
            } else {
              reject(new Error(`GM XHR HTTP ${r.status} size=${r.response?.size ?? 0}`));
            }
          },
          onerror:   e => reject(new Error(`GM XHR error: ${e.error ?? 'unknown'}`)),
          ontimeout: () => reject(new Error('GM XHR timed out')),
        });
      });
      return { blob, fromCache: false };
    }
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`fetch HTTP ${r.status}`);
    const blob = await r.blob();
    if (!blob.size) throw new Error('fetch returned empty blob');
    return { blob, fromCache: false };
  }
  class DownloadService {
    async downloadAll(pages, resolveUrl, titlePrefix, { onProgress } = {}) {
      const entries = [];
      for (const page of pages) {
        try {
          if (page.loaded && page.imageUrl) {
            entries.push({ page, url: page.imageUrl, wasLoaded: true });
          } else {
            const url = await resolveUrl(page);
            if (url) entries.push({ page, url, wasLoaded: false });
          }
        } catch (err) {
          console.warn(`[eHunter-js] could not resolve page ${page.index + 1} for download`, err);
        }
      }
      if (!entries.length) return;
      let JSZip;
      try { JSZip = await loadJSZip(); } catch {   }
      if (JSZip) {
        await this._zip(entries, titlePrefix, JSZip, onProgress);
      } else {
        await this._sequential(entries, titlePrefix, onProgress);
      }
    }
    async _fetchWithRetry(url, maxRetries = 3, imgEls) {
      let lastErr;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await fetchImageBlob(url, imgEls);
          if (!result.blob || result.blob.size === 0) throw new Error('empty blob');
          return result;
        } catch (err) {
          lastErr = err;
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 800 * attempt));
        }
      }
      throw lastErr;
    }
    async _zip(entries, titlePrefix, JSZip, onProgress) {
      const zip = new JSZip();
      let done = 0, cached = 0, fetched = 0, failed = 0;
      const total = entries.length;
      const imgEls = Array.from(document.querySelectorAll('img.r-page-img'));
      const CACHE_CONCURRENCY   = 16;
      const NETWORK_CONCURRENCY =  4;
      const results = new Array(total);
      const runPool = async (items, concurrency) => {
        let idx = 0;
        const worker = async () => {
          while (idx < items.length) {
            const { entry, origIdx } = items[idx++];
            const { page, url, wasLoaded } = entry;
            try {
              const { blob, fromCache } = await this._fetchWithRetry(url, 3, imgEls);
              results[origIdx] = { page, url, blob, ok: true };
              if (wasLoaded || fromCache) cached++; else fetched++;
            } catch (err) {
              results[origIdx] = { page, ok: false };
              failed++;
              console.warn(`[eHunter-js] skipping page ${page.index + 1} after retries`, err);
            }
            done++;
            onProgress?.(done, total, { cached, fetched, failed });
          }
        };
        await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
      };
      const cacheItems   = entries.map((e, i) => ({ entry: e, origIdx: i })).filter(x => x.entry.wasLoaded);
      const networkItems = entries.map((e, i) => ({ entry: e, origIdx: i })).filter(x => !x.entry.wasLoaded);
      await Promise.all([
        runPool(cacheItems,   CACHE_CONCURRENCY),
        runPool(networkItems, NETWORK_CONCURRENCY),
      ]);
      for (const r of results) {
        if (r?.ok) zip.file(`${String(r.page.index + 1).padStart(3, '0')}.${this._ext(r.url, r.blob.type)}`, r.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      if (zipBlob.size > 22) this._saveBlob(zipBlob, `${titlePrefix}.zip`);
    }
    async _sequential(entries, titlePrefix, onProgress) {
      const imgEls = Array.from(document.querySelectorAll('img.r-page-img'));
      let cached = 0, fetched = 0, failed = 0;
      for (let i = 0; i < entries.length; i++) {
        const { page, url, wasLoaded } = entries[i];
        try {
          const { blob, fromCache } = await this._fetchWithRetry(url, 3, imgEls);
          this._saveBlob(blob, `${titlePrefix}_${String(page.index + 1).padStart(3, '0')}.${this._ext(url, blob.type)}`);
          if (wasLoaded || fromCache) cached++; else fetched++;
          if (!wasLoaded && !fromCache) await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          failed++;
          console.warn(`[eHunter-js] failed page ${page.index + 1} after retries`, err);
        }
        onProgress?.(i + 1, entries.length, { cached, fetched, failed });
      }
    }
    _ext(url, mimeType) {
      const path = (url ?? '').split('?')[0];
      const last = path.split('.').pop().toLowerCase();
      if (DownloadService._KNOWN_EXTS.has(last)) return last;
      return DownloadService._MIME[mimeType] ?? 'jpg';
    }
    _saveBlob(blob, filename) {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
    }
  }
  DownloadService._MIME       = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
  DownloadService._KNOWN_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
  function createSharedPageLoader(albumService) {
    const tokens      = new Map();
    const inFlight    = new Map();
    const autoTimers  = new Map();
    const failCounts  = new Map();
    const domHandles  = new Map();
    function registerDom(index, handles) {
      domHandles.set(index, handles);
    }
    function _clearAutoRetry(index) {
      clearTimeout(autoTimers.get(index));
      autoTimers.delete(index);
    }
    function _scheduleAutoRetry(page) {
      _clearAutoRetry(page.index);
      const attempts = failCounts.get(page.index) ?? 0;
      if (attempts >= 3) return;
      failCounts.set(page.index, attempts + 1);
      const delay = CONFIG.autoRetryDelay * (attempts + 1);
      const tid = setTimeout(() => {
        autoTimers.delete(page.index);
        const handles = domHandles.get(page.index);
        if (!handles || page.loaded) return;
        _kick(page, handles.wrapperEl, handles.imgEl, handles.statusEl, { force: true }, handles.onLoaded);
      }, delay);
      autoTimers.set(page.index, tid);
    }
    function loadInto(page, wrapperEl, imgEl, statusEl, opts = {}, onLoaded) {
      registerDom(page.index, { wrapperEl, imgEl, statusEl, onLoaded });
      const wantsHD = opts.highRes ?? false;
      if (page.loaded && !opts.force && !(wantsHD && !page.loadedAsHD)) {
        if (page.imageUrl && imgEl.src !== page.imageUrl) {
          imgEl.src = page.imageUrl;
          imgEl.classList.add('r-page-img--loaded');
          wrapperEl.classList.add('r-page--loaded');
          wrapperEl.classList.remove('r-page--loading', 'r-page--failed');
          wrapperEl.style.aspectRatio = '';
          onLoaded?.();
        } else if (imgEl.src === page.imageUrl) {
          const wrapLoaded = wrapperEl.classList.contains('r-page--loaded');
          const imgLoaded  = imgEl.classList.contains('r-page-img--loaded');
          if (!wrapLoaded || !imgLoaded) {
            wrapperEl.classList.add('r-page--loaded');
            wrapperEl.classList.remove('r-page--loading', 'r-page--failed');
            imgEl.classList.add('r-page-img--loaded');
            if (!wrapLoaded) onLoaded?.();
          }
        }
        return;
      }
      if (inFlight.has(page.index)) {
        if (!opts.force) return;
        inFlight.delete(page.index);
      }
      _kick(page, wrapperEl, imgEl, statusEl, opts, onLoaded);
    }
    function _kick(page, wrapperEl, imgEl, statusEl, opts, onLoaded) {
      if (opts.force) { failCounts.delete(page.index); _clearAutoRetry(page.index); }
      if (opts.force) page.cacheToken = (page.cacheToken ?? 0) + 1;
      const _wantsHD = opts.highRes ?? false;
      if (page.loaded && page.imageUrl && !opts.force && !(_wantsHD && !page.loadedAsHD)) {
        wrapperEl.classList.remove('r-page--loading', 'r-page--failed');
        wrapperEl.classList.add('r-page--loaded');
        wrapperEl.style.aspectRatio = '';
        imgEl.src = page.imageUrl;
        imgEl.classList.add('r-page-img--loaded');
        if (statusEl) statusEl.textContent = '';
        onLoaded?.();
        return;
      }
      const curW = imgEl.naturalWidth, curH = imgEl.naturalHeight;
      if (curW && curH) wrapperEl.style.aspectRatio = `${curW} / ${curH}`;
      wrapperEl.classList.remove('r-page--failed', 'r-page--loaded');
      wrapperEl.classList.add('r-page--loading');
      imgEl.classList.remove('r-page-img--loaded');
      if (statusEl) statusEl.textContent = 'Loading…';
      wrapperEl.dispatchEvent(new CustomEvent('r:reloadstarted', { bubbles: false }));
      page.loaded = false;
      page.imageUrl = null;
      const loadOpts = { highRes: opts.highRes ?? false, priority: 10 };
      const srcPromise = opts.force
        ? albumService.reloadPageSources(page, loadOpts)
        : albumService.getPageSources(page, loadOpts);
      const p = srcPromise
        .then(sources => _attempt(page, wrapperEl, imgEl, statusEl, sources, 0, 1, onLoaded, loadOpts.highRes))
        .catch(err => {
          console.error(`[eHunter-js] source fetch failed p${page.index + 1}`, err);
          wrapperEl.classList.remove('r-page--loading');
          wrapperEl.classList.add('r-page--failed');
          if (statusEl) statusEl.textContent = 'Could not reach any source — click to retry';
          _scheduleAutoRetry(page);
        })
        .finally(() => { if (inFlight.get(page.index) === p) inFlight.delete(page.index); });
      inFlight.set(page.index, p);
    }
    function skipSource(page, wrapperEl, imgEl, statusEl, onLoaded) {
      registerDom(page.index, { wrapperEl, imgEl, statusEl, onLoaded });
      const highRes = !!(page.loadedAsHD);
      const key = `${page.index}:${highRes ? 'hi' : 'lo'}`;
      const cached = albumService.sourceCache?.get(key);
      if (!cached || cached.length <= 1) {
        _kick(page, wrapperEl, imgEl, statusEl, { force: true }, onLoaded);
        return;
      }
      const currentSrcIdx = cached.indexOf(imgEl.src);
      const nextSrcIdx = currentSrcIdx >= 0 ? currentSrcIdx + 1 : 1;
      if (nextSrcIdx >= cached.length) {
        _kick(page, wrapperEl, imgEl, statusEl, { force: true }, onLoaded);
        return;
      }
      if (failCounts.has(page.index)) failCounts.delete(page.index);
      _clearAutoRetry(page.index);
      page.cacheToken = (page.cacheToken ?? 0) + 1;
      page.loaded = false;
      page.imageUrl = null;
      wrapperEl.classList.remove('r-page--failed', 'r-page--loaded');
      wrapperEl.classList.add('r-page--loading');
      imgEl.classList.remove('r-page-img--loaded');
      if (statusEl) statusEl.textContent = 'Trying next source…';
      wrapperEl.dispatchEvent(new CustomEvent('r:reloadstarted', { bubbles: false }));
      const p = Promise.resolve()
        .then(() => _attempt(page, wrapperEl, imgEl, statusEl, cached, nextSrcIdx, 1, onLoaded, highRes))
        .finally(() => { if (inFlight.get(page.index) === p) inFlight.delete(page.index); });
      inFlight.set(page.index, p);
    }
    function _attempt(page, wrapperEl, imgEl, statusEl, sources, srcIdx, retryN, onLoaded, highRes = false) {
      if (!sources?.length || srcIdx >= sources.length) {
        wrapperEl.classList.remove('r-page--loading');
        wrapperEl.classList.add('r-page--failed');
        if (statusEl) statusEl.textContent = 'Every source failed — click to retry';
        _scheduleAutoRetry(page);
        return;
      }
      const token = (tokens.get(page.index) ?? 0) + 1;
      tokens.set(page.index, token);
      const alive = () => tokens.get(page.index) === token;
      let settled = false;
      let elapsed = 0;
      const srcLabel = sources.length > 1 ? ` (src ${srcIdx + 1}/${sources.length})` : '';
      if (statusEl) statusEl.textContent = `Loading…${srcLabel}`;
      let ticker = null;
      const tickerStart = setTimeout(() => {
        if (settled || !alive()) return;
        ticker = setInterval(() => {
          if (settled || !alive()) { clearInterval(ticker); ticker = null; return; }
          elapsed++;
          if (statusEl) statusEl.textContent = `Loading… ${elapsed}s${srcLabel}`;
        }, 1000);
      }, 2000);
      const fail = () => {
        if (settled || !alive()) return;
        settled = true;
        clearTimeout(watchdog);
        clearTimeout(tickerStart);
        if (ticker) { clearInterval(ticker); ticker = null; }
        if (retryN < 2) {
          const delay = 1200 * retryN;
          if (statusEl) statusEl.textContent = `Retrying in ${Math.round(delay/1000)}s…${srcLabel}`;
          setTimeout(() => { if (alive()) _attempt(page, wrapperEl, imgEl, statusEl, sources, srcIdx, retryN + 1, onLoaded, highRes); }, delay);
        } else {
          _attempt(page, wrapperEl, imgEl, statusEl, sources, srcIdx + 1, 1, onLoaded, highRes);
        }
      };
      const watchdog = setTimeout(fail, CONFIG.imageTimeoutMs);
      imgEl.src = sources[srcIdx];
      imgEl.onerror = fail;
      const _hideBlurOnce = (() => {
        let called = false;
        return () => {
          if (called) return;
          called = true;
          wrapperEl.dispatchEvent(new CustomEvent('r:loadstarted', { bubbles: false }));
        };
      })();
      imgEl.addEventListener('loadstart', _hideBlurOnce, { once: true });
      imgEl.addEventListener('progress',  _hideBlurOnce, { once: true });
      imgEl.onload = () => {
        if (settled || !alive()) return;
        settled = true;
        _hideBlurOnce();
        clearTimeout(watchdog);
        clearTimeout(tickerStart);
        if (ticker) { clearInterval(ticker); ticker = null; }
        page.loaded      = true;
        page.imageUrl    = sources[srcIdx];
        page.loadedAsHD  = !!highRes;
        failCounts.delete(page.index);
        _clearAutoRetry(page.index);
        wrapperEl.classList.remove('r-page--loading', 'r-page--failed');
        wrapperEl.classList.add('r-page--loaded');
        wrapperEl.style.aspectRatio = '';
        imgEl.classList.add('r-page-img--loaded');
        onLoaded?.();
      };
    }
    function destroy() {
      autoTimers.forEach(t => clearTimeout(t));
      autoTimers.clear();
      inFlight.clear();
    }
    return { loadInto, skipSource, destroy };
  }
  function createPagePlaceholder(pageIndex, { onOriginal, onRefresh, onOtherSource } = {}) {
    const statusEl = h('div', { class: 'r-placeholder__status' }, 'Waiting…');
    const thumbBg  = h('div', { class: 'r-placeholder__thumb-bg' });
    const el = h('div', { class: 'r-placeholder' }, [
      thumbBg,
      h('div', { class: 'r-placeholder__num' }, String(pageIndex + 1)),
      statusEl,
      h('div', { class: 'r-placeholder__actions' }, [
        h('a', { class: 'r-placeholder__action', onClick: e => { e.stopPropagation(); onOriginal?.(); } }, 'Original'),
        h('a', { class: 'r-placeholder__action', onClick: e => { e.stopPropagation(); onRefresh?.(); } }, 'Refresh'),
        h('a', { class: 'r-placeholder__action', onClick: e => { e.stopPropagation(); onOtherSource?.(); } }, 'Other source'),
      ]),
    ]);
    let _bgResizeObs = null;
    return {
      el, statusEl,
      hideBlur: () => {
        thumbBg.classList.remove('r-placeholder__thumb-bg--visible');
      },
      showBlur: () => {
        if (thumbBg.style.backgroundImage) {
          thumbBg.classList.add('r-placeholder__thumb-bg--visible');
        }
      },
      attachToWrapper: (wrapEl) => {
        wrapEl.addEventListener('r:loadstarted', () => {
          thumbBg.classList.remove('r-placeholder__thumb-bg--visible');
        });
        wrapEl.addEventListener('r:reloadstarted', () => {
          if (thumbBg.style.backgroundImage) {
            thumbBg.classList.add('r-placeholder__thumb-bg--visible');
          }
        });
      },
      setContainerSize: (wrapEl, data, zoom = 1) => {
        if (!wrapEl || !data) return;
        const cropW = (typeof data === 'object' && data.width)  ? data.width  : null;
        const cropH = (typeof data === 'object' && data.height) ? data.height : null;
        if (!cropW || !cropH) return;
        const ratio = cropW / cropH;
        wrapEl.style.aspectRatio = `${ratio}`;
      },
      setThumbBg: data => {
        if (!data) return;
        const url      = typeof data === 'string' ? data : data.url;
        const isSprite = typeof data === 'object' && data.offsetX != null;
        if (!url) return;
        if (thumbBg.dataset.paintedUrl === url) {
          thumbBg.classList.add('r-placeholder__thumb-bg--visible');
          return;
        }
        thumbBg.dataset.paintedUrl = url;
        if (!isSprite) {
          thumbBg.style.backgroundImage    = `url("${url}")`;
          thumbBg.style.backgroundSize     = 'cover';
          thumbBg.style.backgroundPosition = 'center';
          thumbBg.classList.add('r-placeholder__thumb-bg--visible');
          return;
        }
        const probe = new Image();
        probe.onload = () => {
          const spriteW = probe.naturalWidth;
          const spriteH = probe.naturalHeight;
          const cropW   = data.width  || spriteW;
          const cropH   = data.height || spriteH;
          const ox      = data.offsetX ?? 0;
          const oy      = data.offsetY ?? 0;
          const fit = () => {
            const rect = thumbBg.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const zoomEl = thumbBg.closest('.r-bookmode');
            const cssZoom = zoomEl
              ? parseFloat(getComputedStyle(zoomEl).getPropertyValue('--r-zoom') || '1') || 1
              : 1;
            const w = rect.width  / cssZoom;
            const h = rect.height / cssZoom;
            const scale  = Math.max(w / cropW, h / cropH);
            const tileW  = cropW * scale;
            const tileH  = cropH * scale;
            const posX = ox * scale - (tileW - w) / 2;
            const posY = oy * scale - (tileH - h) / 2;
            thumbBg.style.backgroundImage    = `url("${url}")`;
            thumbBg.style.backgroundSize     = `${spriteW * scale}px ${spriteH * scale}px`;
            thumbBg.style.backgroundPosition = `${posX}px ${posY}px`;
          };
          fit();
          if (!thumbBg.closest('.r-page--loaded')) {
            thumbBg.classList.add('r-placeholder__thumb-bg--visible');
          }
          if (typeof ResizeObserver !== 'undefined') {
            if (_bgResizeObs) _bgResizeObs.disconnect();
            _bgResizeObs = new ResizeObserver(fit);
            _bgResizeObs.observe(thumbBg);
          }
        };
        probe.onerror = () => {   };
        probe.src = url;
      },
      destroy: () => {
        if (_bgResizeObs) { _bgResizeObs.disconnect(); _bgResizeObs = null; }
      },
    };
  }
  function createToast() {
    const el = h('div', { class: 'r-toast' });
    let hideTimer = null;
    function show(message, { type = 'info', durationMs = 3000 } = {}) {
      el.textContent = message;
      el.className = `r-toast r-toast--${type} r-toast--visible`;
      clearTimeout(hideTimer);
      if (durationMs > 0) hideTimer = setTimeout(() => el.classList.remove('r-toast--visible'), durationMs);
    }
    return { el, show };
  }
  function createDialog() {
    const box = h('div', { class: 'r-dialog' });
    const overlay = h('div', { class: 'r-overlay', style: { display: 'none' } }, [box]);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    function open(contentEl, title = '') {
      clear(box);
      if (title) box.appendChild(h('div', { class: 'r-dialog__title' }, title));
      box.appendChild(contentEl);
      box.appendChild(h('button', { class: 'r-btn r-dialog__close r-btn--close', onClick: close }, [icon(ICONS.close, 14)]));
      overlay.style.display = 'flex';
    }
    function close() { overlay.style.display = 'none'; }
    return { el: overlay, open, close };
  }
  function createSettingsContent({ state, i18n, onChange }) {
    const langSelect = h(
      'select', { class: 'r-select', onChange: e => onChange({ lang: e.target.value }) },
      ['en', 'zh', 'jp'].map(c => h('option', { value: c, ...(i18n.lang === c ? { selected: '' } : {}) }, c === 'en' ? 'English' : c === 'zh' ? '中文' : '日本語'))
    );
    const switchRow = (label, checked, onCh) => h('label', { class: 'r-switch-row' }, [
      h('span', {}, label),
      h('span', { class: 'r-switch' }, [
        h('input', { type: 'checkbox', ...(checked ? { checked: '' } : {}), onChange: e => onCh(e.target.checked) }),
        h('span', { class: 'r-switch__track' }),
      ]),
    ]);
    const numInput = (key, defaultVal, min, max, labelText, hint) => {
      const inp = h('input', {
        type: 'number', min: String(min), max: String(max), step: '1',
        value: String(state.pref.data[key] ?? defaultVal),
        class: 'r-settings__num-input',
        onChange: e => {
          const v = Math.min(max, Math.max(min, parseInt(e.target.value, 10) || defaultVal));
          e.target.value = String(v);
          onChange({ [key]: v });
        },
      });
      return h('div', {}, [
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: hint ? '3px' : '0' } }, [
          h('span', { class: 'r-settings__label', style: { marginBottom: '0' } }, labelText),
          inp,
        ]),
        ...(hint ? [h('div', { class: 'r-settings__hint' }, hint)] : []),
      ]);
    };
    return h('div', { class: 'r-settings' }, [
      h('div', {}, [h('span', { class: 'r-settings__label' }, 'Language'), langSelect]),
      switchRow('Right-to-left reading (manga)', state.rtl,    v => onChange({ rtl: v })),
      ...(state.album.supportsHD !== false ? [
        switchRow('Always load full resolution', state.highRes, v => onChange({ highRes: v })),
        h('div', { class: 'r-settings__hint' }, 'Use the per-page HD button to load just one page at original quality.'),
      ] : [h('div', { class: 'r-settings__hint' }, 'HD/original resolution is not available on this site.')]),
      h('button', { class: 'r-btn', onClick: () => onChange({ zoom: 1 }) }, 'Reset zoom to 100%'),
      h('div', { style: { borderTop: '1px solid var(--r-border)', paddingTop: '12px', marginTop: '2px' } }, [
        h('div', { class: 'r-settings__label', style: { marginBottom: '10px', fontWeight: '600', color: 'var(--r-fg)', opacity: '0.9' } }, 'Preload settings'),
        numInput('initialForward',  CONFIG.defaultInitialForward,  0, 20, 'Initial forward pages',
          'Pages loaded immediately on open (ahead). Default: 3'),
        h('div', { style: { marginTop: '8px' } },
          [numInput('initialBackward', CONFIG.defaultInitialBackward, 0, 10, 'Initial backward pages',
            'Pages loaded immediately on open (behind). Default: 1')]),
        h('div', { style: { marginTop: '8px' } },
          [numInput('preloadForward',  CONFIG.defaultPreloadForward,  1, 50, 'Preload forward window',
            'How many pages ahead to always keep loaded. Default: 15')]),
        h('div', { style: { marginTop: '8px' } },
          [numInput('preloadBackward', CONFIG.defaultPreloadBackward, 0, 20, 'Preload backward window',
            'How many pages behind to keep loaded. Default: 5')]),
        h('div', { class: 'r-settings__hint', style: { marginTop: '6px' } },
          'Changes apply to the next page turn. Settings are saved automatically.'),
      ]),
      h('div', { class: 'r-settings__label' }, 'Keyboard shortcuts'),
      h('div', { class: 'r-settings__shortcut-grid' }, [
        h('div', { class: 'r-settings__key' }, 'T'), h('div', { class: 'r-settings__key-desc' }, 'Toggle thumbnails'),
        h('div', { class: 'r-settings__key' }, 'M'), h('div', { class: 'r-settings__key-desc' }, 'Switch mode'),
        h('div', { class: 'r-settings__key' }, '+'), h('div', { class: 'r-settings__key-desc' }, 'Zoom in'),
        h('div', { class: 'r-settings__key' }, '−'), h('div', { class: 'r-settings__key-desc' }, 'Zoom out'),
        h('div', { class: 'r-settings__key' }, 'Esc'), h('div', { class: 'r-settings__key-desc' }, 'Close reader'),
        h('div', { class: 'r-settings__key' }, '←/→'), h('div', { class: 'r-settings__key-desc' }, 'Previous/next (book mode)'),
      ]),
    ]);
  }
  function createTopBar({ state, i18n, onAction }) {
    const el = h('div', { class: 'r-topbar', style: { position: 'relative' } });
    function btn(labelKey, actionKey, ico, extraClass = '') {
      const b = h('button', { class: `r-btn${extraClass}`, title: labelKey, onClick: () => onAction(actionKey) });
      if (ico) b.appendChild(icon(ICONS[ico], 13));
      b.appendChild(document.createTextNode(' ' + i18n.t(labelKey)));
      return b;
    }
    const pageCounterEl = h('span', { class: 'r-topbar__page' });
    const progressBarEl = h('div',  { class: 'r-progressbar' });
    let _builtForMode    = null;
    let _builtForThumb   = null;
    let _modeBtn  = null;
    let _thumbBtn = null;
    function _updateLive() {
      const total = state.album.pages.length;
      const pct = total ? Math.round(((state.currentPage + 1) / total) * 100) : 0;
      pageCounterEl.textContent = state.isLoadingAlbum ? 'Loading…' : `${state.currentPage + 1} / ${total || '?'}`;
      progressBarEl.style.width = pct + '%';
    }
    function render() {
      const isScroll = state.mode === 'scroll';
      const modeChanged  = state.mode      !== _builtForMode;
      const thumbChanged = state.thumbVisible !== _builtForThumb;
      if (modeChanged || thumbChanged || !_modeBtn) {
        _builtForMode  = state.mode;
        _builtForThumb = state.thumbVisible;
        _modeBtn  = btn(isScroll ? 'bookMode' : 'scrollMode', 'toggle-mode', isScroll ? 'book' : 'scroll');
        _thumbBtn = btn('thumbnails', 'toggle-thumbs', 'thumbs', state.thumbVisible ? ' r-btn--active' : '');
        clear(el);
        el.append(
          h('span', { class: 'r-topbar__title', title: state.album.title }, state.album.title || 'eHunter'),
          h('div', { class: 'r-topbar__sep' }),
          _modeBtn,
          _thumbBtn,
          h('div', { class: 'r-topbar__sep' }),
          btn('zoomOut', 'zoom-out', 'zoomOut'),
          btn('zoomIn', 'zoom-in', 'zoomIn'),
          h('div', { class: 'r-topbar__sep' }),
          btn('download', 'download', 'download'),
          btn('settings', 'settings', 'settings'),
          pageCounterEl,
          h('div', { class: 'r-topbar__sep' }),
          (() => { const b = h('button', { class: 'r-btn r-btn--close', title: 'Close', onClick: () => onAction('close') }); b.appendChild(icon(ICONS.close, 13)); return b; })(),
          progressBarEl
        );
      }
      _updateLive();
    }
    render();
    return { el, render };
  }
  function createThumbnailBar({ state, albumService, onSelect }) {
    const el = h('div', { class: 'r-thumbbar' });
    let wrapByIndex = new Map();
    let activeIndex = -1;
    const elToWrap = new Map();
    function paintThumb(div, data) {
      if (!data) { div.classList.add('r-thumb--missing'); return; }
      const url = typeof data === 'string' ? data : data.url;
      const isSprite = typeof data === 'object' && data.offsetX != null;
      if (!url) { div.classList.add('r-thumb--missing'); return; }
      const probe = new Image();
      probe.onload = () => {
        div.classList.remove('r-thumb--missing');
        if (isSprite) {
          const cropW = data.width  || probe.naturalWidth;
          const cropH = data.height || probe.naturalHeight;
          if (cropW && cropH) div.style.aspectRatio = `${cropW} / ${cropH}`;
          paintSpriteBackground(div, data, probe.naturalWidth, probe.naturalHeight);
        } else {
          if (probe.naturalWidth && probe.naturalHeight) {
            div.style.aspectRatio = `${probe.naturalWidth} / ${probe.naturalHeight}`;
          }
          div.style.backgroundImage = `url("${url}")`;
          div.style.backgroundSize = 'cover';
          div.style.backgroundPosition = 'center';
          div.style.backgroundRepeat = 'no-repeat';
        }
      };
      probe.onerror = () => div.classList.add('r-thumb--missing');
      probe.src = url;
    }
    function resolveAndSet(div, page) {
      thumbObs.unobserve(div);
      const wrap = elToWrap.get(div);
      div.classList.add('r-thumb--shimmer');
      albumService.resolveThumb(page).then(() => {
        div.classList.remove('r-thumb--shimmer');
        const data = page.thumbStyle ? { url: page.thumb, ...page.thumbStyle } : page.thumb;
        if (data) {
          paintThumb(div, data);
          wrap?.classList.remove('r-thumb--missing');
        } else {
          wrap?.classList.add('r-thumb--missing');
          if (wrap) wrap.onclick = e => { e.stopPropagation(); resolveAndSet(div, page); };
        }
      }).catch(() => {
        div.classList.remove('r-thumb--shimmer');
        wrap?.classList.add('r-thumb--missing');
        if (wrap) wrap.onclick = e => { e.stopPropagation(); resolveAndSet(div, page); };
      });
    }
    let thumbObs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const idx = Number(e.target.dataset.index);
        const page = state.album.pages[idx];
        if (page) resolveAndSet(e.target, page);
      }
    }, { root: el, rootMargin: '200px 0px' });
    // Divs that need thumbObs.observe() once the bar becomes visible.
    // Cleared (and observed) by startObserving(). Also cleared at the top of
    // _buildDom() so a second album-load never leaks stale entries.
    const pendingObserve = new Set();
    function startObserving() {
      for (const div of pendingObserve) thumbObs.observe(div);
      pendingObserve.clear();
    }
    // Track which album the DOM was last built for so we only rebuild on album change.
    let _builtForPages = null;
    // Build (or rebuild) the full DOM — called only when the page list changes.
    function _buildDom() {
      thumbObs.disconnect();
      elToWrap.forEach((_, div) => div._spriteUnobserve?.());
      pendingObserve.clear();
      elToWrap.clear();
      clear(el);
      wrapByIndex = new Map();
      activeIndex = state.currentPage;
      _builtForPages = state.album.pages;
      state.album.pages.forEach(page => {
        const div = h('div', { class: 'r-thumb', 'data-index': String(page.index) });
        const badge = h('div', { class: 'r-thumb-badge' }, String(page.index + 1));
        const wrap = h('div', { class: `r-thumb-wrap${page.index === state.currentPage ? ' r-thumb-wrap--active' : ''}`, onClick: () => onSelect(page.index) }, [div, badge]);
        elToWrap.set(div, wrap);
        if (page.thumbStyle || page.thumb) {
          paintThumb(div, page.thumbStyle ? { url: page.thumb, ...page.thumbStyle } : page.thumb);
          wrap.classList.remove('r-thumb--missing');
        } else {
          // Defer observation: if the bar is already visible, observe immediately;
          // otherwise queue for startObserving() which fires on first show.
          pendingObserve.add(div);
        }
        wrapByIndex.set(page.index, wrap);
        el.appendChild(wrap);
      });
      // If bar is visible right now, kick off observation immediately.
      if (state.thumbVisible) requestAnimationFrame(() => startObserving());
    }
    // Lightweight update: only toggle visibility and sync the active indicator.
    // Does NOT touch the DOM structure — avoids rebuilding hundreds of nodes on
    // every page turn, mode switch, or zoom change.
    function render() {
      const pagesChanged = state.album.pages !== _builtForPages;
      if (pagesChanged) _buildDom();
      const wasVisible = el.style.display !== 'none';
      el.style.display = state.thumbVisible ? 'flex' : 'none';
      // If the bar just became visible and there are pending divs, start observing.
      if (state.thumbVisible && !wasVisible && pendingObserve.size) {
        requestAnimationFrame(() => startObserving());
      }
      updateActive(state.currentPage);
    }
    function updateActive(index) {
      if (index === activeIndex) return;
      wrapByIndex.get(activeIndex)?.classList.remove('r-thumb-wrap--active');
      wrapByIndex.get(index)?.classList.add('r-thumb-wrap--active');
      activeIndex = index;
      wrapByIndex.get(index)?.scrollIntoView({ block: 'nearest' });
    }
    render();
    return {
      el, render, updateActive,
      onShow: startObserving,
      destroy: () => { thumbObs.disconnect(); elToWrap.forEach((_, div) => div._spriteUnobserve?.()); pendingObserve.clear(); elToWrap.clear(); },
    };
  }
  function computeMaxZoom(modeEl, mode) {
    if (mode !== 'book' || !modeEl) return Infinity;
    const container = modeEl;
    const availW = container.clientWidth || window.innerWidth;
    const availH = container.clientHeight || window.innerHeight;
    const imgs = Array.from(container.querySelectorAll('.r-page-img--book'));
    if (!imgs.length) return Infinity;
    let totalW = 0;
    let anyMeasured = false;
    for (const img of imgs) {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh) {
        const curZoomStr = container.style.getPropertyValue('--r-zoom') || '1';
        const curZoom = parseFloat(curZoomStr) || 1;
        const renderedW = img.offsetWidth;
        totalW += renderedW / curZoom;
        anyMeasured = true;
        continue;
      }
      anyMeasured = true;
      const renderedH = Math.min(nh, 0.92 * availH);
      const renderedW = nw * (renderedH / nh);
      totalW += renderedW;
    }
    if (!anyMeasured || totalW <= 0) return Infinity;
    totalW += (imgs.length - 1) * 4;
    const max = availW / totalW;
    return Math.max(0.25, Math.round(max * 100) / 100);
  }
  function createScrollMode({ state, albumService, loader, preloadEngine }) {
    const el = h('div', { class: 'r-scrollmode' });
    const pageEls = new Map();
    const placeholderMap = new Map();
    let _lastScrollY = 0;
    let _barHidden = false;
    let _suppressScrollUntil = 0;
    function _onScroll() {
      if (performance.now() < _suppressScrollUntil) {
        _lastScrollY = el.scrollTop;
        return;
      }
      const root = document.getElementById('ehunter-js-root');
      if (!root) return;
      const sy = el.scrollTop;
      const delta = sy - _lastScrollY;
      _lastScrollY = sy;
      if (sy < 80) {
        if (_barHidden) { _barHidden = false; root.classList.remove('r-bar-hidden'); }
        return;
      }
      if (delta > 4 && !_barHidden) { _barHidden = true; root.classList.add('r-bar-hidden'); }
      if (delta < -4 && _barHidden)  { _barHidden = false; root.classList.remove('r-bar-hidden'); }
    }
    el.addEventListener('scroll', _onScroll, { passive: true });
    function _removeScrollListener() { el.removeEventListener('scroll', _onScroll); }
    function applyZoom() {
      el.style.setProperty('--r-zoom', state.zoom);
      _suppressScrollUntil = performance.now() + 300;
      _lastScrollY = el.scrollTop;
    }
    function showBar() {
      const root = document.getElementById('ehunter-js-root');
      if (root && _barHidden) { _barHidden = false; root.classList.remove('r-bar-hidden'); }
    }
    const loadObserver = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) loadPage(Number(e.target.dataset.index));
      }
    }, { root: el, rootMargin: '400px 0px', threshold: 0 });
    const visibleRatios = new Map();
    const pageObserver = new IntersectionObserver(entries => {
      for (const e of entries) {
        const idx = Number(e.target.dataset.index);
        if (e.isIntersecting) visibleRatios.set(idx, e.intersectionRatio);
        else visibleRatios.delete(idx);
      }
      if (visibleRatios.size) {
        const topmost = Math.min(...visibleRatios.keys());
        state.setCurrentPage(topmost);
        preloadEngine?.onPageVisible(state.album.pages, topmost);
      }
    }, { root: el, rootMargin: '0px', threshold: [0, 0.1, 0.5, 1.0] });
    const observer = {
      observe:    el => { loadObserver.observe(el); pageObserver.observe(el); },
      disconnect: ()  => { loadObserver.disconnect(); pageObserver.disconnect(); },
    };
    function loadPage(index, opts = {}) {
      const page = state.album.pages[index];
      const refs = pageEls.get(index);
      const wrap   = refs?.wrap;
      const img    = refs?.img;
      const status = refs?.status;
      if (!page || !img || !wrap) return;
      const ph = placeholderMap.get(index);
      if (ph) {
        const thumbData = () => page.thumbStyle ? { url: page.thumb, ...page.thumbStyle } : page.thumb;
        const feedThumbBg = () => {
          const data = thumbData();
          ph.setThumbBg(data);
          ph.setContainerSize(wrap, data, state.zoom);
          if (!opts.force) ph.showBlur();
        };
        if (page.thumb) feedThumbBg();
        else albumService.resolveThumb(page).then(feedThumbBg).catch(() => {});
      }
      const fullOpts = { ...opts, highRes: opts.highRes ?? state.isHighResPage(index) };
      loader.loadInto(page, wrap, img, status, fullOpts, () => {
        ph?.hideBlur();
        preloadEngine?.onPageVisible(state.album.pages, index);
      });
    }
    function render() {
      observer.disconnect();
      placeholderMap.forEach(ph => ph.destroy());
      clear(el);
      pageEls.clear();
      placeholderMap.clear();
      applyZoom();
      state.album.pages.forEach(page => {
        const img = h('img', { class: 'r-page-img', alt: `page-${page.index + 1}` });
        const hdBtn = state.album.supportsHD ? h('button', {
          class: `r-hd-btn${state.isHighResPage(page.index) ? ' r-hd-btn--active' : ''}`,
          title: 'Toggle original resolution',
          onClick: e => { e.stopPropagation(); const isHd = state.highResPages.has(page.index); state.setHighResForPage(page.index, !isHd); hdBtn.classList.toggle('r-hd-btn--active', !isHd); loadPage(page.index, { force: true, highRes: !isHd }); },
        }, 'HD') : null;
        const ph = createPagePlaceholder(page.index, {
          onOriginal:    () => { state.setHighResForPage(page.index, true); loadPage(page.index, { force: true, highRes: true }); },
          onRefresh:     () => loadPage(page.index, { force: true }),
          onOtherSource: () => {
            const refs = pageEls.get(page.index);
            if (refs?.wrap && refs?.img) loader.skipSource(page, refs.wrap, refs.img, refs.status);
          },
        });
        placeholderMap.set(page.index, ph);
        const wrap = h('div', {
          class: 'r-page',
          'data-index': String(page.index),
          onClick: () => { if (wrap.classList.contains('r-page--failed')) loadPage(page.index, { force: true }); },
        }, [ph.el, img, hdBtn]);
        ph.attachToWrapper(wrap);
        pageEls.set(page.index, { wrap, img, status: ph.statusEl });
        el.appendChild(wrap);
      });
      pageEls.forEach(refs => observer.observe(refs.wrap));
      requestAnimationFrame(() => {
        const { initialForward: initFwd = CONFIG.defaultInitialForward,
                initialBackward: initBwd = CONFIG.defaultInitialBackward } = state.pref?.data ?? {};
        const startPage = state.currentPage;
        for (let i = Math.max(0, startPage - initBwd); i <= Math.min(state.album.pages.length - 1, startPage + initFwd - 1); i++) {
          loadPage(i);
        }
      });
    }
    function scrollToPage(index) { pageEls.get(index)?.wrap?.scrollIntoView({ block: 'start' }); }
    function applyZoomOnly() { applyZoom(); }
    function reloadAll() {
      pageEls.forEach((refs, i) => {
        const page = state.album.pages[i];
        if (!page) return;
        if (page.loaded || refs.wrap.classList.contains('r-page--loading') || refs.wrap.classList.contains('r-page--failed')) {
          preloadEngine?.cancelPage(i);
          loadPage(i, { force: true });
        }
      });
    }
    render();
    return { el, render, scrollToPage, reloadAll, applyZoom: applyZoomOnly, showBar, destroy: () => {
      _removeScrollListener();
      observer.disconnect();
      placeholderMap.forEach(ph => ph.destroy());
      showBar();
    } };
  }
  function createBookMode({ state, albumService, loader, preloadEngine }) {
    const el = h('div', { class: 'r-bookmode' });
    let spreads = [];
    let spreadIndex = 0;
    function recompute() {
      spreads = computeBookSpreads(state.album.pages.length, state.rtl);
      spreadIndex = Math.max(0, spreads.findIndex(s => s.includes(state.currentPage)));
    }
    function loadPageAt(idx) {
      const page = state.album.pages[idx];
      const handles = currentHandles.get(idx);
      const wrap   = handles?.wrap;
      const img    = handles?.img;
      const status = handles?.status;
      if (!page || !wrap || !img) return;
      const ph = placeholderMap.get(idx);
      ph?.showBlur();
      loader.loadInto(page, wrap, img, status, { highRes: state.isHighResPage(idx), force: !page.loaded }, () => {
        ph?.hideBlur();
        applyZoom();
      });
    }
    function skipAt(idx) {
      const page = state.album.pages[idx];
      const handles = currentHandles.get(idx);
      const wrap   = handles?.wrap;
      const img    = handles?.img;
      const status = handles?.status;
      if (!page || !wrap || !img) return;
      loader.skipSource(page, wrap, img, status);
    }
    function applyZoom() {
      const maxZ = computeMaxZoom(el, 'book');
      if (state.zoom > maxZ) {
        state.zoom = maxZ;
        state.pref.save({ zoom: maxZ });
      }
      el.style.setProperty('--r-zoom', state.zoom);
    }
    function buildWrap(idx) {
      const page = state.album.pages[idx];
      const img = h('img', { class: 'r-page-img r-page-img--book', alt: `page-${idx + 1}` });
      let wrap;
      let status;
      const hdBtn = state.album.supportsHD ? h('button', {
        class: `r-hd-btn${state.isHighResPage(idx) ? ' r-hd-btn--active' : ''}`,
        title: 'Toggle original resolution',
        onClick: e => { e.stopPropagation(); const isHd = state.highResPages.has(idx); state.setHighResForPage(idx, !isHd); hdBtn.classList.toggle('r-hd-btn--active', !isHd); loader.loadInto(page, wrap, img, status, { force: true, highRes: !isHd }); },
      }, 'HD') : null;
      const ph = createPagePlaceholder(idx, {
        onOriginal:    () => { state.setHighResForPage(idx, true); loader.loadInto(page, wrap, img, status, { force: true, highRes: true }); },
        onRefresh:     () => loader.loadInto(page, wrap, img, status, { force: true, highRes: state.isHighResPage(idx) }),
        onOtherSource: () => skipAt(idx),
      });
      status = ph.statusEl;
      const feedThumbBg = () => {
        const data = page.thumbStyle ? { url: page.thumb, ...page.thumbStyle } : page.thumb;
        ph.setThumbBg(data);
        ph.setContainerSize(wrap, data, state.zoom);
        ph.showBlur();
      };
      if (page.thumb) feedThumbBg();
      else albumService.resolveThumb(page).then(feedThumbBg).catch(() => {});
      wrap = h('div', { class: 'r-page r-page--book', 'data-index': String(idx), onClick: () => { if (wrap.classList.contains('r-page--failed')) loadPageAt(idx); } }, [ph.el, img, hdBtn]);
      ph.attachToWrapper(wrap);
      el.appendChild(wrap);
      placeholderMap.set(idx, ph);
      return { wrap, img, status, ph };
    }
    const currentHandles = new Map();
    const placeholderMap = new Map();
    function renderSpread() {
      placeholderMap.forEach(ph => ph.destroy());
      clear(el);
      currentHandles.clear();
      placeholderMap.clear();
      applyZoom();
      const indices = spreads[spreadIndex] ?? [];
      indices.forEach(idx => {
        const handles = buildWrap(idx);
        currentHandles.set(idx, handles);
        loadPageAt(idx);
      });
      el.appendChild(h('div', { class: 'r-clickzone r-clickzone--left',  onClick: () => state.rtl ? _nav.next() : _nav.prev() }));
      el.appendChild(h('div', { class: 'r-clickzone r-clickzone--right', onClick: () => state.rtl ? _nav.prev() : _nav.next() }));
      state.setCurrentPage(indices[0] ?? state.currentPage);
      preloadEngine?.onPageVisible(state.album.pages, state.currentPage);
    }
    function next() { if (spreadIndex < spreads.length - 1) { spreadIndex++; renderSpread(); } }
    function prev() { if (spreadIndex > 0) { spreadIndex--; renderSpread(); } }
    function onKey(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); e.stopPropagation(); state.rtl ? next() : prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); state.rtl ? prev() : next(); }
    }
    function reloadAll() {
      (spreads[spreadIndex] ?? []).forEach(idx => {
        const handles = currentHandles.get(idx);
        const wrap   = handles?.wrap;
        const img    = handles?.img;
        if (!wrap || !img) return;
        loader.loadInto(state.album.pages[idx], wrap, img, handles?.status ?? null, { force: true, highRes: state.isHighResPage(idx) });
      });
    }
    // _nav is a mutable dispatch table so renderSpread's click-zones always call
    // the current (possibly wrapped) next/prev even though closures are formed first.
    const _nav = { next: () => {}, prev: () => {} };
    recompute();
    renderSpread();

    // ---- topbar auto-hide for book mode ----
    // Mirror of scroll mode's scroll-driven hide: hide the bar after a page turn
    // (key or click-zone click), show it again on mouse movement, with a longer
    // mouse-idle timer as a secondary fallback. Hovering the topbar itself pauses
    // the timer so users can aim at buttons without the bar vanishing mid-click.
    const BOOK_TURN_MS  = 1800;  // delay after a page turn before hiding
    const BOOK_MOUSE_MS = 3500;  // delay after last mouse movement before hiding
    let _idleTimer = null;
    let _bookBarHidden = false;
    function _getRoot() { return document.getElementById('ehunter-js-root'); }
    function _showBar() {
      const root = _getRoot();
      if (root && _bookBarHidden) { _bookBarHidden = false; root.classList.remove('r-bar-hidden'); }
    }
    function _hideBar() {
      const root = _getRoot();
      if (root && !_bookBarHidden) { _bookBarHidden = true; root.classList.add('r-bar-hidden'); }
    }
    // After a page turn: bar stays visible briefly, then fades — feels like "focus on content"
    function _armTurnTimer() {
      clearTimeout(_idleTimer);
      _idleTimer = setTimeout(_hideBar, BOOK_TURN_MS);
    }
    // On mouse movement: show bar, reset to longer idle window
    function _onMouseMove() {
      _showBar();
      clearTimeout(_idleTimer);
      _idleTimer = setTimeout(_hideBar, BOOK_MOUSE_MS);
    }
    // Hovering the topbar itself: pause the timer so the bar doesn't vanish mid-aim
    function _onTopbarEnter() { clearTimeout(_idleTimer); }
    function _onTopbarLeave() { _idleTimer = setTimeout(_hideBar, BOOK_MOUSE_MS); }

    // Wrap next/prev so every page turn arms the short hide timer
    const _rawNext = next, _rawPrev = prev;
    function next() { _rawNext(); _showBar(); _armTurnTimer(); }
    function prev() { _rawPrev(); _showBar(); _armTurnTimer(); }

    // Click-zones call next/prev directly via closure so the wrappers above handle them.
    // Re-wire the left/right arrow keys through the wrapped versions.
    function onKeyNav(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); e.stopPropagation(); state.rtl ? next() : prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); state.rtl ? prev() : next(); }
    }
    window.addEventListener('keydown', onKeyNav, true);

    el.addEventListener('mousemove', _onMouseMove, { passive: true });
    const _topbarEl = document.querySelector('.r-topbar');
    _topbarEl?.addEventListener('mouseenter', _onTopbarEnter);
    _topbarEl?.addEventListener('mouseleave', _onTopbarLeave);

    // Point _nav at the wrapped versions so click-zones benefit from the hide-on-turn logic
    _nav.next = next;
    _nav.prev = prev;

    // Start with bar visible; arm the mouse-idle timer
    _showBar();
    _idleTimer = setTimeout(_hideBar, BOOK_MOUSE_MS);

    return {
      el,
      render: () => { recompute(); renderSpread(); },
      applyZoom,
      next, prev, reloadAll,
      destroy: () => {
        window.removeEventListener('keydown', onKeyNav, true);
        clearTimeout(_idleTimer);
        _topbarEl?.removeEventListener('mouseenter', _onTopbarEnter);
        _topbarEl?.removeEventListener('mouseleave', _onTopbarLeave);
        const root = _getRoot();
        if (root) { _bookBarHidden = false; root.classList.remove('r-bar-hidden'); }
      },
    };
  }
  async function mountApp({ platformService, meta, rootId = CONFIG.rootId }) {
    const bus = new EventBus();
    const pref = new LayoutPreference();
    const i18n = new I18n(pref.data.lang);
    const state = new AppState(bus, pref);
    const albumService = new AlbumService(platformService);
    const downloadService = new DownloadService();
    const album = await albumService.loadAlbum(meta);
    state.setAlbum(album);
    state.setLoadingAlbum(false);
    const sharedLoader = createSharedPageLoader(albumService);
    const preloadEngine = createPreloadEngine(albumService, pref, i => state.isHighResPage(i));
    preloadEngine.onAlbumReady(album.pages, 0);
    const root = h('div', { id: rootId });
    document.documentElement.appendChild(root);
    const dialog  = createDialog();
    const toast   = createToast();
    const topBar  = createTopBar({ state, i18n, onAction });
    const thumbBar = createThumbnailBar({ state, albumService, onSelect: goToPage });
    const body    = h('div', { class: 'r-body' });
    root.append(topBar.el, body, dialog.el, toast.el);
    body.append(thumbBar.el);
    let modeComp = mountMode(state.mode);
    modeComp.applyZoom?.();
    function mountMode(mode) {
      body.querySelector('.r-scrollmode, .r-bookmode')?.remove();
      const comp = mode === 'book'
        ? createBookMode({ state, albumService, loader: sharedLoader, preloadEngine })
        : createScrollMode({ state, albumService, loader: sharedLoader, preloadEngine });
      body.appendChild(comp.el);
      return comp;
    }
    function goToPage(index) {
      state.setCurrentPage(index);
      if (state.mode === 'scroll') modeComp.scrollToPage(index);
      else modeComp.render();
    }
    function onAction(action) {
      const root = document.getElementById('ehunter-js-root');
      root?.classList.remove('r-bar-hidden');
      switch (action) {
        case 'toggle-mode':
          modeComp.destroy?.();
          state.setMode(state.mode === 'scroll' ? 'book' : 'scroll');
          modeComp = mountMode(state.mode);
          modeComp.applyZoom?.();
          break;
        case 'toggle-thumbs':
          state.toggleThumbnails();
          if (state.thumbVisible) requestAnimationFrame(() => thumbBar.onShow());
          break;
        case 'zoom-in': {
          const maxZ = state.mode === 'book' ? computeMaxZoom(modeComp.el, 'book') : Infinity;
          state.setZoom(state.zoom + 0.05, maxZ);
          modeComp.applyZoom?.();
          break;
        }
        case 'zoom-out':
          state.setZoom(state.zoom - 0.05);
          modeComp.applyZoom?.();
          break;
        case 'download': {
          const total = state.album.pages.length;
          toast.show(`Preparing download… 0 / ${total}`, { durationMs: 0 });
          downloadService.downloadAll(
            state.album.pages,
            page => albumService.getPageSources(page, { highRes: state.isHighResPage(page.index) }).then(s => s[0] ?? null),
            state.album.title || 'album',
            { onProgress: (done, _total, { cached, fetched, failed }) => {
                const parts = [`${done} / ${total}`];
                if (cached)  parts.push(`${cached} cached`);
                if (fetched) parts.push(`${fetched} fetched`);
                if (failed)  parts.push(`${failed} failed`);
                toast.show(`Downloading…  ${parts.join('  ·  ')}`, { durationMs: 0 });
              }
            }
          )
          .then(() => toast.show('Download complete ✓', { type: 'success', durationMs: 5000 }))
          .catch(err => { console.error(err); toast.show('Download failed — see console', { type: 'error' }); });
          break;
        }
        case 'settings': {
          const content = createSettingsContent({ state, i18n, onChange: patch => {
            if (patch.lang)        { i18n.setLang(patch.lang); pref.save({ lang: patch.lang }); topBar.render(); }
            if (patch.rtl != null) { state.rtl = patch.rtl;   pref.save({ rtl: patch.rtl });   modeComp.render?.(); }
            if (patch.zoom != null)    { const maxZ = state.mode === 'book' ? computeMaxZoom(modeComp.el, 'book') : Infinity; state.setZoom(patch.zoom, maxZ); modeComp.applyZoom?.(); }
            if (patch.highRes != null) { state.setHighRes(patch.highRes); toast.show(patch.highRes ? 'Full resolution enabled' : 'Switched to compressed images', { durationMs: 2500 }); modeComp.reloadAll?.(); }
            const preloadKeys = ['initialForward', 'initialBackward', 'preloadForward', 'preloadBackward'];
            const preloadPatch = {};
            let hasPreload = false;
            for (const k of preloadKeys) { if (patch[k] != null) { preloadPatch[k] = patch[k]; hasPreload = true; } }
            if (hasPreload) pref.save(preloadPatch);
          }});
          dialog.open(content, i18n.t('settings'));
          break;
        }
        case 'close':
          root.remove();
          modeComp.destroy?.();
          sharedLoader.destroy?.();
          window.removeEventListener('keydown', onGlobalKey);
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
          break;
      }
    }
    let lastPages = state.album.pages;
    let lastThumbVisible = state.thumbVisible;
    bus.on('state:changed', () => {
      topBar.render();
      if (state.album.pages !== lastPages || state.thumbVisible !== lastThumbVisible) {
        thumbBar.render();
        lastPages = state.album.pages;
        lastThumbVisible = state.thumbVisible;
      } else {
        thumbBar.updateActive(state.currentPage);
      }
    });
    function onGlobalKey(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      switch (e.key) {
        case 't': case 'T': onAction('toggle-thumbs'); break;
        case 'm': case 'M': onAction('toggle-mode');   break;
        case '+': case '=': e.preventDefault(); onAction('zoom-in');  break;
        case '-': case '_': e.preventDefault(); onAction('zoom-out'); break;
        case 'Escape':      onAction('close');          break;
      }
    }
    window.addEventListener('keydown', onGlobalKey);
    return { root, state, bus };
  }
  function showBootOverlay() {
    injectStyles();
    const labelEl = h('div', { class: 'r-boot__label' }, 'Loading gallery…');
    const el = h('div', { class: 'r-boot', id: 'ehunter-js-boot' }, [
      h('div', { class: 'r-boot__ring' }),
      labelEl,
    ]);
    document.documentElement.appendChild(el);
    return {
      remove: () => el.remove(),
      fail: msg => {
        el.querySelector('.r-boot__ring')?.remove();
        labelEl.textContent = msg;
        el.classList.add('r-boot--error');
        el.appendChild(h('button', { class: 'r-btn', style: { marginTop: '14px' }, onClick: () => el.remove() }, 'Dismiss'));
      },
    };
  }
  const MAX_GRID_PAGES = 40;
  function extractThumbData(anchor) {
    let width = null, height = null, bgUrl = null, offsetX = null, offsetY = null;
    const d = anchor.querySelector('div');
    if (d) {
      const cs = d.style;
      const w = parseInt(cs.width, 10);  if (!Number.isNaN(w)) width = w;
      const hv = parseInt(cs.height, 10); if (!Number.isNaN(hv)) height = hv;
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        const m = cs.backgroundImage.match(/url\((['"]?)(.*?)\1\)/i);
        if (m) {
          bgUrl = m[2];
          const [xStr, yStr] = (cs.backgroundPosition || '0px 0px').trim().split(/\s+/);
          offsetX = parseFloat(xStr) || 0;
          offsetY = parseFloat(yStr) || 0;
        }
      }
    }
    if (bgUrl) return { url: bgUrl, offsetX, offsetY, width, height };
    // Fallback: regex over the raw HTML text, in case anchor came from a context where
    // .style wasn't populated (e.g. a plain string was hand-parsed some other way).
    const html = anchor.innerHTML;
    const sizeMatch = html.match(/width:\s*(\d+)px[\s;]+height:\s*(\d+)px/i)
                    || html.match(/height:\s*(\d+)px[\s;]+width:\s*(\d+)px/i);
    let rWidth = null, rHeight = null;
    if (sizeMatch) {
      const isHeightFirst = /^height/i.test(sizeMatch[0]);
      rWidth = parseInt(isHeightFirst ? sizeMatch[2] : sizeMatch[1], 10);
      rHeight = parseInt(isHeightFirst ? sizeMatch[1] : sizeMatch[2], 10);
    }
    const bgMatch = html.match(/background(?:-image)?:\s*(?:transparent\s+)?url\(([^)]+)\)\s*(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)(?:px)?\s+no-repeat/i);
    if (bgMatch) {
      return { url: bgMatch[1], offsetX: parseFloat(bgMatch[2]), offsetY: parseFloat(bgMatch[3]), width: rWidth, height: rHeight };
    }
    const bgImgMatch = html.match(/background-image:\s*url\((['"]?)([^'")\s]+)\1\)/i);
    if (bgImgMatch && bgImgMatch[2]) return { url: bgImgMatch[2], offsetX: null, offsetY: null, width: rWidth, height: rHeight };
    // Last resort: look for the actual thumbnail <img> that isn't a navigation icon.
    // EH nav icons live at ehgt.org/g/*.png or *.gif — skip those.
    const img = anchor.querySelector('img');
    if (img) {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (src && !/ehgt\.org\/g\/[^/]+\.(png|gif)$/i.test(src)) return { url: src, offsetX: null, offsetY: null, width: rWidth, height: rHeight };
    }
    return null;
  }
  // Paints one sprite crop directly as this element's own background — no extra child
  // elements, no transforms, nothing that can drift out of sync with the container.
  // Earlier versions resized/repositioned a separate tile element and scaled it with a CSS
  // transform to "cover" the container; that kept breaking because (a) any later inline-style
  // write on the tile (even `cssText =`) silently wiped its position, and (b) the container's
  // own measured size sometimes turned out to depend on the very tile box we'd just resized,
  // so the "fit" math was measuring a target that had already been corrupted by the same call.
  //
  // Instead: scale the ENTIRE sprite sheet via background-size (using its real loaded pixel
  // size, spriteW/spriteH), and shift it via background-position (scaling the crop's raw
  // offset by the same factor) so exactly this one crop — scaled to "cover" the container,
  // centered, cropping whichever axis overhangs — fills the element. Recomputed from the
  // element's actual getBoundingClientRect() every time, so it's correct regardless of when
  // or how the element ends up sized.
  const spriteResizeObs = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(entries => { for (const e of entries) e.target._spriteFit?.(); })
    : null;
  function paintSpriteBackground(el, data, spriteW, spriteH) {
    const { url, offsetX, offsetY, width, height } = data;
    const w = width || 84, hgt = height || 126;
    el._spriteFit = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return; // resized to 0 (e.g. hidden) — retry via ResizeObserver
      const scale = Math.max(rect.width / w, rect.height / hgt); // "cover": fill box, crop overhang
      const tileW = w * scale, tileH = hgt * scale;
      const posX = offsetX * scale - (tileW - rect.width) / 2;   // center whichever axis overhangs
      const posY = offsetY * scale - (tileH - rect.height) / 2;
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundSize = `${spriteW * scale}px ${spriteH * scale}px`;
      el.style.backgroundPosition = `${posX}px ${posY}px`;
    };
    el._spriteFit();
    // Unobserve first in case this element was already being observed (e.g. thumb
    // data resolved after a repaint) — prevents accumulating duplicate observations
    // on the global singleton spriteResizeObs, which would otherwise grow unboundedly.
    spriteResizeObs?.unobserve(el);
    spriteResizeObs?.observe(el);
    // Store a cleanup handle on the element so callers can unobserve it on removal.
    el._spriteUnobserve = () => spriteResizeObs?.unobserve(el);
  }
  // Legacy shim for any caller that only wants the plain URL.
  function extractThumbUrl(anchor) {
    return extractThumbData(anchor)?.url ?? null;
  }
  function createEhAdapter() {
    return {
      name: 'eh',
      _grid: null,
      getGalleryId() {
        const m = location.pathname.match(/\/g\/(\d+)\/(\w+)/);
        return m ? { gid: m[1], token: m[2] } : null;
      },
      _resolveGalleryUrl(doc) {
        const direct = doc.querySelector('a[href*="/g/"]');
        if (direct) return direct.href;
        return Array.from(doc.querySelectorAll('a')).find(a => /\/g\/\d+\/\w+/.test(a.getAttribute('href') || ''))?.href ?? null;
      },
      _extractTotalPages(doc) {
        const m = (doc.querySelector('.sn')?.textContent ?? '').match(/(\d+)\s*\/\s*(\d+)/);
        return m ? parseInt(m[2], 10) : null;
      },
      async _fetchGridPageAnchors(p) {
        const base = this._grid.galleryUrl;
        const url = p === 0 ? base : `${base}${base.includes('?') ? '&' : '?'}p=${p}`;
        const doc = await withRetry(() => fetchDoc(url));
        return { doc, anchors: Array.from(doc.querySelectorAll('#gdt a')).filter(a => /\/s\//.test(a.getAttribute('href') || '')) };
      },
      async _fillGridUpTo(target) {
        const g = this._grid;
        while (g.links.length <= target && !g.exhausted && g.nextPage < MAX_GRID_PAGES) {
          const { anchors } = await this._fetchGridPageAnchors(g.nextPage);
          if (!anchors.length) { g.exhausted = true; break; }
          for (const a of anchors) { g.links.push(a.href); g.thumbs.push(extractThumbData(a)); }
          g.nextPage++;
          if (g.links.length <= target) await politeDelay(300);
        }
      },
      async _ensureGridUpTo(index) {
        const g = this._grid;
        const prevSettled = (g._chain ?? Promise.resolve()).catch(() => {});
        const task = prevSettled.then(() => this._fillGridUpTo(index));
        g._chain = task.catch(() => {});
        await task;
        if (!g.exhausted && !g._lookaheadQueued) {
          g._lookaheadQueued = true;
          const look = g._chain.then(() => this._fillGridUpTo(index + CONFIG.gridLookahead));
          g._chain = look.catch(() => {});
          look.catch(() => {}).finally(() => { g._lookaheadQueued = false; });
        }
      },
      async fetchMeta() {
        const readerDoc = await withRetry(() => fetchDoc(location.href));
        const galleryUrl = this._resolveGalleryUrl(readerDoc) ?? location.href;
        const expectedTotal = this._extractTotalPages(readerDoc);
        this._grid = { galleryUrl, links: [], thumbs: [], nextPage: 0, exhausted: false };
        const { doc: firstDoc, anchors: first } = await this._fetchGridPageAnchors(0);
        for (const a of first) { this._grid.links.push(a.href); this._grid.thumbs.push(extractThumbData(a)); }
        this._grid.nextPage = 1;
        if (!first.length) this._grid.exhausted = true;
        const title = firstDoc.querySelector('#gn')?.textContent?.trim() ?? readerDoc.querySelector('h1')?.textContent?.trim() ?? document.title;
        return {
          title,
          pageCount: expectedTotal ?? this._grid.links.length,
          getPageLink:  async i => { await this._ensureGridUpTo(i); return this._grid.links[i] ?? null; },
          getThumbLink: async i => { await this._ensureGridUpTo(i); return this._grid.thumbs[i] ?? null; }, // {url, style} | null
        };
      },
      async fetchPageImageSources(page, pageUrl, { highRes = false } = {}) {
        const rawHtml = await withRetry(() => fetchText(pageUrl));
        const imgMatch = rawHtml.match(/id="img"\s+src="([^"]+)"/);
        const normal = imgMatch ? imgMatch[1] : null;
        let original = null;
        if (highRes) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml.replace(/\bsrc=/g, 'x-src='), 'text/html');
            const i6Kids = doc.querySelector('#i6')?.children;
            if (i6Kids?.length) {
              original = i6Kids[i6Kids.length - 1].children[1]?.getAttribute('href') ?? null;
            }
            if (!original) {
              const dlMatch = rawHtml.match(/href="(https?:\/\/[^"]+)"[^>]*>\s*Download original/i);
              if (dlMatch) original = dlMatch[1];
            }
            // Final fallback: nl= source reassignment
            if (!original) {
              const onclick = doc.querySelector('#loadfail')?.getAttribute('onclick') ?? '';
              const nlMatch = onclick.match(/nl\('([^']+)'\)/);
              if (nlMatch) {
                const sourceId = nlMatch[1];
                const sep = pageUrl.includes('?') ? '&' : '?';
                const reloadRaw = await withRetry(() => fetchText(`${pageUrl}${sep}nl=${sourceId}`));
                const reloadMatch = reloadRaw.match(/id="img"\s+x?src="([^"]+)"/);
                if (reloadMatch) original = reloadMatch[1];
              }
            }
          } catch (e) {
            console.warn('[eHunter-js] original-image lookup failed', e);
          }
        }
        const sources = (highRes ? [original, normal] : [normal, original])
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i);
        return sources;
      },
    };
  }
  // Recursively searches a JSON structure for an nhentai gallery object (has media_id + images).
  function _deepFindGallery(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return null;
    if (obj.media_id != null && obj.images) return obj;
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          const found = _deepFindGallery(item, depth + 1);
          if (found) return found;
        }
      } else {
        const found = _deepFindGallery(val, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  // Decode SvelteKit's flat value-pool format and search for a gallery object.
  // SvelteKit serialises load() data as:
  //   { nodes: [ { type: "data", data: [pool values...], uses: {} } ] }
  // where objects in the pool are plain JS objects (not index maps in modern SK).
  // This walks every value in every node's data pool.
  function _decodeSvelteKitPool(svData, id) {
    if (!svData || typeof svData !== 'object') return null;
    const nodes = Array.isArray(svData.nodes) ? svData.nodes : [];
    for (const node of nodes) {
      if (!node) continue;
      // Pool is node.data (array) or node itself might be the data
      const pools = [node.data, node].filter(Array.isArray);
      for (const pool of pools) {
        for (const item of pool) {
          if (item && typeof item === 'object' && item.media_id != null && item.images) return item;
          // Sometimes the gallery is nested one level under a key like 'book' or 'gallery'
          if (item && typeof item === 'object') {
            for (const v of Object.values(item)) {
              if (v && typeof v === 'object' && v.media_id != null && v.images) return v;
            }
          }
        }
      }
    }
    return null;
  }

  // Scrapes the current live DOM for SvelteKit hydration data containing the gallery.
  // This is the fastest path after a SPA navigation because no fetch is needed.
  function _extractNhGalleryFromDom(id) {
    // SvelteKit injects its serialised store into a <script> with id="__sveltekit_data"
    // or a script whose text content starts with `__sveltekit_data =`.
    const candidates = [
      document.getElementById('__sveltekit_data'),
      ...Array.from(document.querySelectorAll('script[type="application/json"]')),
      ...Array.from(document.querySelectorAll('script:not([src])')).filter(s =>
        s.textContent.includes('media_id') || s.textContent.includes('"' + id + '"')
      ),
    ].filter(Boolean);

    for (const el of candidates) {
      let text = el.textContent.trim();
      // Strip leading assignment if present: `__sveltekit_data = {...}`
      text = text.replace(/^\s*\w[\w.]*\s*=\s*/, '');
      try {
        const parsed = JSON.parse(text);
        const found = _deepFindGallery(parsed) ?? _decodeSvelteKitPool(parsed, id);
        if (found) return found;
      } catch {   }
    }
    return null;
  }
  const EXT_BY_TYPE = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };
  const extFor = t => EXT_BY_TYPE[t] ?? 'jpg';
  const NH_IMAGE_HOSTS = ['i1.nhentai.net','i2.nhentai.net','i3.nhentai.net','i4.nhentai.net','i5.nhentai.net'];
  // nhentai now serves images as .webp regardless of the type code in the API response.
  // Fall back to the declared extension only when the type is explicitly non-webp.
  const nhExtFor = t => (t === 'p' ? 'png' : t === 'g' ? 'gif' : 'webp');
  const buildImageUrl = (mid, n, t) => { const host = NH_IMAGE_HOSTS[(n - 1) % NH_IMAGE_HOSTS.length]; return `https://${host}/galleries/${mid}/${n}.${nhExtFor(t)}`; };
  const NH_THUMB_HOSTS = ['t1.nhentai.net','t2.nhentai.net','t3.nhentai.net','t4.nhentai.net'];
  const buildThumbUrl = (mid, n, t) => { const host = NH_THUMB_HOSTS[(n - 1) % NH_THUMB_HOSTS.length]; return `https://${host}/galleries/${mid}/${n}t.${nhExtFor(t)}`; };
  function createNhAdapter() {
    return {
      name: 'nh',
      getGalleryId() {
        // Matches both /g/12345/ (gallery index) and /g/12345/1/ (reader page)
        const m = location.pathname.match(/\/g\/(\d+)/);
        return m ? { id: m[1] } : null;
      },
      async _fetchGalleryJson(id) {
        // 1. Try window._gallery (legacy / some mirrors still set this)
        if (typeof window !== 'undefined' && window._gallery) return window._gallery;

        // 2. Scrape the live DOM — SvelteKit stores its dehydrated state in
        //    <script id="__sveltekit_data" type="application/json"> (or similar).
        //    This is the fastest path when the script runs after a SPA navigation
        //    because the data is already in the page.
        try {
          const found = _extractNhGalleryFromDom(id);
          if (found) return found;
        } catch (err) {
          console.warn('[eHunter-js] DOM scrape failed', err);
        }

        // 3. Fetch the gallery index HTML and scrape SvelteKit's dehydrated payload.
        //    SvelteKit serialises its load() data as a flat value-pool inside
        //    <script id="__sveltekit_data"> (or an inline script ending in
        //    `__sveltekit_data = {...}`).  The pool format:
        //      { nodes: [ { type: "data", data: [...flat pool...], uses: {...} } ] }
        //    Objects in the pool are encoded as plain JS objects when they are
        //    small, but string/number leaf values share the pool.  We just need
        //    to walk every value in the pool looking for media_id + images.
        const galleryBase = `${location.origin}/g/${id}/`;
        try {
          const html = await withRetry(() => fetchText(galleryBase));

          // 3a. <script type="application/json"> blocks (SvelteKit ≥ 2.x)
          const jsonScriptRe = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
          for (const sm of html.matchAll(jsonScriptRe)) {
            try {
              const parsed = JSON.parse(sm[1]);
              const found = _deepFindGallery(parsed) ?? _decodeSvelteKitPool(parsed, id);
              if (found) return found;
            } catch {   }
          }

          // 3b. Inline __sveltekit_data assignment  (SvelteKit 1.x / some builds)
          const assignRe = /\b__sveltekit_data\s*=\s*(\{[\s\S]*?\})(?=\s*;?\s*<\/script>)/;
          const am = html.match(assignRe);
          if (am) {
            try {
              const parsed = JSON.parse(am[1]);
              const found = _deepFindGallery(parsed) ?? _decodeSvelteKitPool(parsed, id);
              if (found) return found;
            } catch {   }
          }

          // 3c. Legacy: JSON.parse("...") pattern (pre-SvelteKit builds)
          const legacyM = html.match(/JSON\.parse\("(.+?)"\)/);
          if (legacyM) {
            try {
              const g = JSON.parse(legacyM[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
              if (g?.media_id) return g;
            } catch {   }
          }
        } catch (err) {
          console.warn('[eHunter-js] HTML fetch/scrape failed', err);
        }

        // 4. SvelteKit __data.json endpoint (works on some deployments)
        try {
          const dataUrl = `${galleryBase}__data.json?x-sveltekit-invalidated=001`;
          const raw = await withRetry(() => fetchText(dataUrl));
          const svData = JSON.parse(raw);
          const found = _deepFindGallery(svData) ?? _decodeSvelteKitPool(svData, id);
          if (found) return found;
        } catch (err) {
          console.warn('[eHunter-js] __data.json fetch failed', err);
        }

        throw new Error(`[eHunter-js] Could not retrieve gallery data for id=${id}. All scraping strategies failed — see console for details.`);
      },
      // Scrape the gallery index page DOM for all the data we need.
      // nhentai's gallery page at /g/ID/ renders thumbnail <img> tags with src like:
      //   https://t4.nhentai.net/galleries/3973899/1t.webp
      //   https://t2.nhentai.net/galleries/3973899/2t.webp.webp
      // These give us: media_id, page count, exact thumbnail URLs (including any double ext),
      // and CDN hosts per page. Full image URLs use the same media_id on i*.nhentai.net.
      // This requires no JSON, no API, and works even when the API returns 403.
      async _scrapeGalleryPage(id) {
        // Fetch the gallery index page (always /g/ID/ regardless of current subpage)
        const galleryUrl = `${location.origin}/g/${id}/`;
        const html = await withRetry(() => fetchText(galleryUrl));
        const parser = new DOMParser();
        // Blank out src= to prevent the browser from firing requests in the parsed doc
        const doc = parser.parseFromString(html.replace(/\bsrc=/g, 'data-src='), 'text/html');

        // Pull title from <h1> or <title>
        const title =
          doc.querySelector('h1')?.textContent?.trim() ||
          doc.querySelector('h2')?.textContent?.trim() ||
          doc.title?.replace(/\s*[»|].*$/, '').trim() ||
          document.title;

        // Thumbnail <img> tags are inside <a href="/g/ID/PAGE/"> links.
        // Each anchor wraps exactly one thumbnail image.
        // The src pattern: https://tN.nhentai.net/galleries/MEDIA_ID/PAGEt.EXT[.EXT]
        const thumbRe = /^https?:\/\/t\d+\.nhentai\.net\/galleries\/(\d+)\/(\d+)t(\..+)$/i;
        const pageAnchors = Array.from(
          doc.querySelectorAll('a[href*="/g/' + id + '/"]')
        ).filter(a => /\/g\/\d+\/\d+\/?$/.test(a.getAttribute('href') || ''));

        const pages = [];
        let mediaId = null;

        for (const anchor of pageAnchors) {
          const img = anchor.querySelector('img[data-src]');
          if (!img) continue;
          const src = img.getAttribute('data-src') || '';
          const m = src.match(thumbRe);
          if (!m) continue;
          const mid  = m[1];
          const pageNum = parseInt(m[2], 10);
          const thumbExt = m[3]; // e.g. ".webp" or ".webp.webp" or ".png.webp"
          if (!mediaId) mediaId = mid;
          pages[pageNum - 1] = { pageNum, thumbUrl: src, thumbExt, mid };
        }

        if (!mediaId || !pages.length) return null;

        // Compact (fill any gaps — shouldn't happen but be safe)
        const compact = pages.filter(Boolean);
        compact.sort((a, b) => a.pageNum - b.pageNum);

        // Derive full-image URLs: same CDN host pattern but on i*.nhentai.net, no 't' suffix.
        // Use the same extension as the thumb (strip any double .webp.webp → just .webp for
        // full images, since thumbs have the 't' marker but full images don't double-up).
        const fullImageHosts = ['i1.nhentai.net','i2.nhentai.net','i3.nhentai.net','i4.nhentai.net','i5.nhentai.net'];
        const fullExt = ext => {
          // Thumb exts look like ".webp", ".webp.webp", ".png.webp"
          // For full images nhentai serves the original format: use the first extension only
          return ext.split('.').filter(Boolean)[0]; // "webp", "png", etc.
        };

        return {
          title,
          mediaId,
          pages: compact.map((p, i) => ({
            thumbUrl: p.thumbUrl,
            imageUrl: `https://${fullImageHosts[i % fullImageHosts.length]}/galleries/${mediaId}/${p.pageNum}.${fullExt(p.thumbExt)}`,
          })),
        };
      },
      async fetchMeta() {
        const id = this.getGalleryId()?.id;
        if (!id) return null;

        // First try DOM scraping (no API needed, works with 403)
        try {
          const scraped = await this._scrapeGalleryPage(id);
          if (scraped && scraped.pages.length > 0) {
            return {
              title: scraped.title,
              pageCount: scraped.pages.length,
              pageLinks:  scraped.pages.map(p => p.imageUrl),
              thumbLinks: scraped.pages.map(p => p.thumbUrl),
              supportsHD: false,
            };
          }
        } catch (err) {
          console.warn('[eHunter-js] DOM scrape failed, falling back to JSON', err);
        }

        // Fallback: try JSON-based approach
        try {
          const g = await this._fetchGalleryJson(id);
          const mid = g.media_id;
          const pages = g.images?.pages ?? [];
          return {
            title: g.title?.pretty ?? g.title?.english ?? g.title?.japanese ?? document.title,
            pageCount: pages.length,
            pageLinks:  pages.map((p, i) => buildImageUrl(mid, i + 1, p.t)),
            thumbLinks: pages.map((p, i) => buildThumbUrl(mid, i + 1, p.t)),
            supportsHD: false,
          };
        } catch (err) {
          console.warn('[eHunter-js] JSON fallback also failed', err);
        }

        return null;
      },
      async fetchPageImageSources(page, pageUrl) {
        const mirrors = ['i1.nhentai.net', 'i2.nhentai.net', 'i3.nhentai.net', 'i4.nhentai.net', 'i5.nhentai.net'];
        try {
          const url = new URL(pageUrl);
          // Generate mirror variants — the primary URL already has the correct extension
          // from DOM scraping, so just swap hosts
          if (mirrors.includes(url.hostname)) {
            return mirrors.map(host => { const u = new URL(pageUrl); u.hostname = host; return u.toString(); });
          }
          return [pageUrl];
        } catch { return [pageUrl]; }
      },
    };
  }
  // ---------------------------------------------------------------------------
  // PLATFORM DETECTION
  // ---------------------------------------------------------------------------
  function detectPlatform() {
    const h = location.hostname;
    if (h.includes('e-hentai.org') || h.includes('exhentai.org')) return 'eh';
    if (h.includes('nhentai.net')) return 'nh';
    return null;
  }
  function isReaderPage(platform) {
    if (platform === 'eh') return /\/s\//.test(location.pathname);
    // Only activate on individual reader pages /g/12345/1/ — NOT on the gallery index /g/12345/
    if (platform === 'nh') return /\/g\/\d+\/\d+/.test(location.pathname);
    return false;
  }
  const ADAPTERS = { eh: createEhAdapter, nh: createNhAdapter };
  async function initPlatform() {
    const name = detectPlatform();
    if (!name || !isReaderPage(name)) return null;
    const service = ADAPTERS[name]?.();
    if (!service) return null;
    const meta = await service.fetchMeta();
    if (!meta) { console.warn('[eHunter-js] failed to load gallery metadata'); return null; }
    return { name, service, meta };
  }
  // ---------------------------------------------------------------------------
  // BOOTSTRAP
  // ---------------------------------------------------------------------------
  async function bootstrap() {
    const name = detectPlatform();
    const isReader = name && isReaderPage(name);
    const overlay = isReader ? showBootOverlay() : null;
    try {
      const platform = await initPlatform();
      if (!platform) {
        overlay?.fail("Couldn't load gallery metadata — the site's markup may have changed.");
        return;
      }
      await mountApp({ platformService: platform.service, meta: platform.meta });
      overlay?.remove();
    } catch (err) {
      console.error('[eHunter-js] init failed', err);
      overlay?.fail('Something went wrong — see console for details.');
    }
  }
  // ---------------------------------------------------------------------------
  // SPA NAVIGATION WATCHER
  // ---------------------------------------------------------------------------
  // nhentai is a SvelteKit SPA: navigating between pages never triggers a full
  // page reload, so @run-at document-idle fires only once on the very first load.
  // We need to re-run bootstrap() on every client-side navigation that lands on
  // a gallery page, and tear down any existing reader overlay first.
  //
  // Strategy (layered, most reliable first):
  //   1. SvelteKit's own navigation events via window.__sveltekit_router (if exposed)
  //   2. History API monkey-patching (pushState / replaceState)
  //   3. popstate event
  //   4. MutationObserver on <body> as a last-resort fallback
  // ---------------------------------------------------------------------------
  (function startSpaWatcher() {
    const ROOT_ID = CONFIG.rootId;
    let _lastPath = location.pathname;
    let _running = false;

    function teardownReader() {
      const existing = document.getElementById(ROOT_ID);
      if (existing) existing.remove();
      const boot = document.getElementById('ehunter-js-boot');
      if (boot) boot.remove();
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      _running = false;
    }

    function onNavigate() {
      const path = location.pathname;
      if (path === _lastPath) return;
      _lastPath = path;
      // Always tear down the reader when navigating away
      teardownReader();
      const platform = detectPlatform();
      if (platform && isReaderPage(platform)) {
        // Small delay: let SvelteKit finish rendering the new page DOM
        // (especially important for the DOM-scraping path in _extractNhGalleryFromDom)
        setTimeout(() => {
          if (location.pathname !== path) return; // navigated again before timeout
          bootstrap().catch(err => console.error('[eHunter-js] bootstrap error (spa)', err));
        }, 400);
      }
    }

    // 1. Monkey-patch History API
    const _origPush    = history.pushState.bind(history);
    const _origReplace = history.replaceState.bind(history);
    history.pushState = function (...args) {
      _origPush(...args);
      setTimeout(onNavigate, 0);
    };
    history.replaceState = function (...args) {
      _origReplace(...args);
      setTimeout(onNavigate, 0);
    };

    // 2. popstate (back/forward navigation)
    window.addEventListener('popstate', () => setTimeout(onNavigate, 0));

    // 3. SvelteKit navigation events (exposed on window in some builds)
    //    afterNavigate fires after the DOM is committed — ideal timing.
    try {
      const g = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
      if (typeof g.navigation?.addEventListener === 'function') {
        g.navigation.addEventListener('navigate', () => setTimeout(onNavigate, 0));
      }
    } catch {   }

    // 4. MutationObserver fallback: watch for SvelteKit's route marker attribute
    //    or major DOM changes that indicate a page transition completed.
    let _mutTimer = null;
    const _mutObs = new MutationObserver(() => {
      if (location.pathname === _lastPath) return;
      clearTimeout(_mutTimer);
      _mutTimer = setTimeout(onNavigate, 200);
    });
    _mutObs.observe(document.body, { childList: true, subtree: false });

    // Run immediately for the initial page load
    bootstrap().catch(err => console.error('[eHunter-js] bootstrap error', err));
  })();
})();