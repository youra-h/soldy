---
'@soldy-ui/solid': minor
---

Event callbacks run before Solid renders the new state, as on the other platforms: Menu's `onChangeOpen` now comes before its panel's items join. Read the rendered DOM after the callback (an effect or `queueMicrotask`), not inside it
