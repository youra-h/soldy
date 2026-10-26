---
'@soldy-ui/core': minor
---

Attribute and class sets (`TAttributes`, `TAria`, `TDataset`, `TClasses`) lost their `events` bus: they extend the new `TSubscribable` — one "changed" fact without an event name or arguments, `set.subscribe(fn)` returns the unsubscription — and components still emit `change:<set>` events. The `TAttributesEvents`, `TAriaEvents`, `TDatasetEvents` and `TClassesEvents` types are removed. A component no longer subscribes to its own `change:disabled`, `change:tag` and `change:direction`: the setters recompute the sets before the event. A collection item that is never rendered keeps one bus and no emitter of its own — under `Virtual` a ListBox item weighs about 0.8 KB instead of 1.5 KB. To update, replace `set.events.on('change', fn)` with `set.subscribe(fn)`, or listen to the owner's `change:<set>` event.
