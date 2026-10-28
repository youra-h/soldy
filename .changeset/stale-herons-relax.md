---
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
---

Accordion no longer redraws every section with the owner when the consumer gives `item-content` — the slot almost every consumer gives. Each of Accordion's item slots now carries its own section (`item`) in scope, the way a table row's `cell` slot carries its own row, instead of the owner relaying the section from its loop variable (or, in React, calling the slot itself before handing it to the section).
