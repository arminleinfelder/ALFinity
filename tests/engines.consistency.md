# Manual check: both render engines produce the same picture

Covers the consistency check in
[contracts/render-engine.md](../specs/001-fractal-explorer/contracts/render-engine.md).

1. Start the server (`python3 -m http.server 8000`) and open
   <http://localhost:8000/?debug=compare>.
2. Use each reference view below: zoom there, then press **Compare**.
3. Expected: the left (graphics card) and right (CPU) halves look the same; the reported
   share of visibly different pixels is below 1%.

| # | Where | How to get there | Expected |
|---|---|---|---|
| 1 | Whole set | Start view | < 1% differ |
| 2 | Seahorse valley, ~100× | Zoom into the gap between the main bulb and the left bulb, upper edge | < 1% differ |
| 3 | Near the GPU limit | Keep zooming on the same spot until the status shows the CPU engine taking over, zoom out one step, press Compare | GPU side still sharp, < 2% differ |

Differences can only appear right at the edge of the set, where tiny rounding differences
change whether a point escapes. Large differences or a blocky left half mean
`GPU_PRECISION` in `js/view.js` is too permissive.
