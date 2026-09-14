# nextHunter

A pure-JS userscript that replaces the default reader some sites ;) with a clean, minimal overlay reader. No external dependencies, no backend — just drop it in your userscript manager and go.

## Features

- **Scroll & Book modes** — continuous vertical scrolling or side-by-side page view, switchable on the fly
- **Zoom control** — adjustable via toolbar buttons or keyboard shortcuts
- **Thumbnail sidebar** — jump to any page instantly
- **Blurred thumbnail preview** — shows a low-res placeholder while full images load
- **Image mirror fallback** — automatically retries failed images across multiple CDN hosts
- **Auto-hide toolbar** — top bar slides away while reading, reappears on hover
- **Progress bar** — shows reading position at a glance
- **Persistent settings** — preferences saved via `GM_setValue` / `GM_getValue`
- **SPA navigation support** — works correctly on nhentai's SvelteKit client-side routing without requiring a page reload
- **Keyboard shortcuts** — navigate pages, toggle modes, and adjust zoom from the keyboard
- 
## Installation

1. Install a userscript manager such as [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open `newHunter.js` and click **Install**, or copy-paste its contents into a new script in your manager.
3. Navigate to any gallery reader page — the script activates automatically.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next page (book mode) |
| `+` / `-` | Zoom in / out |
| `B` | Toggle book mode |
| `T` | Toggle thumbnail sidebar |
| `H` | Toggle top bar |

*(Full shortcut list visible in the in-reader settings panel.)*

## Settings

Click the **⚙** icon in the top bar to open the settings dialog. Options include:

- Reading mode (scroll / book)
- Zoom level
- Preload depth (how many pages ahead to fetch)
- Keyboard shortcut reference

## Requirements

- A userscript manager that supports `GM_setValue`, `GM_getValue`, `GM_xmlhttpRequest`, and `unsafeWindow`
- A browser with modern CSS support (Chrome, Firefox, Edge)

## License

MIT
