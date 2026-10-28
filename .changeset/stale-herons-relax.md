---
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
---

`AccordionItem` slots now carry their own section (`item`) in scope in every adapter, the way a table row's `cell` slot carries its own row; Accordion relays its `item-*` slots from that scope instead of its loop variable. React: Accordion no longer redraws every section with the owner when the consumer gives `item-content`.
