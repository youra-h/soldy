---
'@soldy-ui/webc': minor
---

Element classes no longer have `is()`: `el instanceof TButtonElement` now narrows the node to the element with its props (TypeScript 5.3 or later). Replace `TButtonElement.is(el)` with `el instanceof TButtonElement`.
