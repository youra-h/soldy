---
'@soldy-ui/svelte': patch
---

Svelte components keep fewer markup blocks per copy: the root mounts by `rendered` without an `{#if}` around it, slots that owners always hand render by a call, and the spaces between parts no longer become text nodes. A list box copy is about 9% lighter.
