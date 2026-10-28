---
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

The adapter context has a fourth phase, detach: the first moment of the teardown, before the children go. The context only reports it; every adapter stops the consumer on it, and a collection reports it to its items and Tabs panels, so in Svelte, Solid and Angular an item no longer hears its siblings leave when the whole collection goes. An Angular component taken out of the document sends nothing (its owner heard its items leave one by one), and a React item no longer hears its own entry into the collection: what the acceptance writes is the starting state, as in the other adapters. Breaking: TCollectionItemExtension and TTabsContentBindingExtension take the own context of the item or the panel instead of its instance, and take the instance from it: { adapter, elevator } instead of { item: adapter.instance, elevator } and { content: adapter.instance, elevator }. IAdapterContext has detach() and the detach event.
