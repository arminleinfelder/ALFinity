# Contract: Share Link

Opens ALFinity with a specific picture (FR-022). Nothing is sent to a server: the data is
in the URL fragment, which browsers do not transmit.

```text
https://<host>/<path>/#s=<base64url(JSON)>
```

The JSON is a FractalSetting (see [data-model.md](../data-model.md)) with short keys to
keep links short:

| Short key | Field |
|---|---|
| `v` | `schemaVersion` |
| `t` | `type` (`"m"` or `"j"`) |
| `j` | `[julia.re, julia.im]` |
| `c` | `[view.cx, view.cy, view.width]` |
| `d` | `detail` |
| `i` | `maxIter` (omitted = Auto) |
| `k` | `[paletteId, shift, density, smooth ? 1 : 0, inside]` |

## Rules

- Numbers keep full precision (needed at deep zoom).
- A link that uses a custom palette embeds its stops as `p: ["#…", …]` so it works on
  devices that do not have that palette.
- An invalid or unreadable link opens the default view with a short notice.
- After opening, the fragment is removed from the address bar so later changes do not
  look like the shared picture.
