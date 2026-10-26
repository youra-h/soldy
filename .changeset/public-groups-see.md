---
'@soldy-ui/core': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

Calendar month picker places create their list on the first opening of their popover: `pickers[i].list` is now `{ ctrl, engine }`, `undefined` until then, and `pickers[i].engine` is gone — read `pickers[i].list?.ctrl` and `pickers[i].list?.engine`.
