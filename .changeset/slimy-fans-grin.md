---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/plugins': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/angular': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/webc': minor
---

Select builds options from `items` on the first opening of its panel (`contentRendered`), as Menu and DatePicker do; closing only hides them, and options written in markup are mounted as before. `Virtual` measures its window once the first drawn item enters the document.

What broke and how to update: before the first opening, options from `items` are not in the document and have no `id` — open the panel (`open`) before reading them.
