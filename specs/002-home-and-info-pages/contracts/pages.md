# Contract: Page Addresses

What visitors, links and home-screen shortcuts can rely on. Paths are relative to the
app's base address (`https://arminleinfelder.github.io/ALFinity/` when hosted).

| Address | Shows |
|---|---|
| `./` and `./index.html` | Home page |
| `./#s=…` and `./index.html#s=…` | Explorer with that picture (forwarded, see below) |
| `./explorer.html` | Explorer with the last view on this device (or the start view) |
| `./explorer.html#s=…` | Explorer with that picture |
| `./introduction.html` | Introduction |
| `./credits.html` | Credits |
| `./about-me.html` | About me |

## Rules

- **Forwarding old share links**: when the home page is opened with a fragment that
  starts with `#s=`, it immediately replaces itself with `explorer.html` plus the same
  query string and fragment. Nothing of the home page is shown and the Back button does
  not return to the forwarding page. Any other fragment is ignored.
- **Query options** (`?nosw`, `?debug=compare`) keep working on the explorer and are
  passed on when forwarding; `?nosw` also turns off offline mode on the other pages.
- **New share links** made by the explorer start with `…/explorer.html#s=`. The
  share-link content is unchanged ([001 share-link contract](../../001-fractal-explorer/contracts/share-link.md)).
- **Home-screen launch** opens `./`, the home page (FR-005). Shortcuts made with 1.1
  use the same address.
- **Offline**: every address above works offline once the app has been loaded over HTTPS
  or localhost.
- **Missing pages** (e.g. a mistyped address) are GitHub Pages' normal 404 when online;
  offline, the service worker falls back to the home page.
