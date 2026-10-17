# Contract: Favorites File

Exchange format for exporting and importing favorites (FR-020, Constitution Principle V).

- **File name**: `alfinity-favorites-YYYY-MM-DD.alfinity.json`
- **Encoding**: UTF-8 JSON

```json
{
  "app": "ALFinity",
  "formatVersion": 1,
  "exported": "2026-10-17T12:00:00Z",
  "palettes": [
    { "id": "custom-…", "name": "Sunset", "stops": ["#1a0533", "#ff6b35", "#ffe66d"] }
  ],
  "favorites": [
    {
      "id": "…uuid…",
      "name": "Seahorse valley",
      "created": "2026-10-17T11:00:00Z",
      "modified": "2026-10-17T11:00:00Z",
      "thumbnail": "data:image/jpeg;base64,…",
      "setting": { "schemaVersion": 1, "type": "mandelbrot", "…": "see data-model.md" }
    }
  ]
}
```

## Rules

- `app` MUST be `"ALFinity"`; otherwise the file is rejected with a friendly message.
- Only custom palettes used by the exported favorites are included.
- **Import never overwrites**: each imported favorite gets a new `id`; a palette whose `id`
  already exists with different colors is imported under a new `id` and its favorites are
  updated to point at it.
- Invalid entries are skipped and listed in an import summary
  ("Imported 12 favorites, skipped 1: …").
- `thumbnail` is optional on import; a missing thumbnail is regenerated.
