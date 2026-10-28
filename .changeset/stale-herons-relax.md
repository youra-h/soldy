---
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
---

Accordion no longer redraws every section with the owner when the consumer gives `item-content` — the slot almost every consumer gives (Vue and React only; Solid and Svelte never had the redraw, but their `AccordionItem` slots now carry `item` too, to match). Each slot now carries its own section (`item`) in scope, the way a table row's `cell` slot carries its own row, instead of the owner relaying it from its loop variable.
