---
'@soldy-ui/core': minor
---

Attribute and class sets (`TAttributes`, `TAria`, `TDataset`, `TClasses`) lost their `events` bus: the owner passes a change callback to the constructor, first among the optional arguments — `new TAria(changed, initial)`, `new TClasses(base, changed, initial)` — and components still emit `change:<set>` events. The `TAttributesEvents`, `TAriaEvents`, `TDatasetEvents` and `TClassesEvents` types are removed. A component no longer subscribes to its own `change:disabled`, `change:tag` and `change:direction`: the setters recompute the sets before the event. A collection item that is never rendered keeps one bus and no emitter of its own — under `Virtual` a ListBox item weighs about 0.8 KB instead of 1.5 KB. To update, pass a callback instead of `set.events.on('change', fn)` and move the initial entries after it, or listen to the owner's `change:<set>` event.
