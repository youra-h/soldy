---
'@soldy-ui/core': patch
---

Collection items take less memory: the `aria`, `dataset`, `attrs` and `classes` sets keep their entries in a compact array instead of a `Map` or `Set`, and a component listens to its four sets with one subscriber. A `TSubscribable` subscriber now receives the object that changed.
