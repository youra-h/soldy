---
'@soldy-ui/svelte': patch
---

Svelte: a binding property gets its own rune only once a tracking context reads it; a property the markup never reads no longer costs a rune. A button copy holds 8 runes instead of 18, a ListBox copy 112 instead of 252.
