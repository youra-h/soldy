---
'@soldy-ui/core': patch
---

The `change:items` event of a collection now carries a snapshot of the list instead of the live storage array: a consumer that keeps the list (in a Solid signal, say) no longer sees it change without an event.
