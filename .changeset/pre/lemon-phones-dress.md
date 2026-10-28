---
'@soldy-ui/vue': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/webc': minor
---

A component's own assembly no longer sends events: on Vue, Svelte, Solid and Web Components a context listens to its events after it is accepted, and a collection binds its facades before the component, as React and Angular do. What the facade writes into the component while mounting is the starting state: Calendar no longer sends `change:months` (and Vue `update:months`) with the months it shows on mount, Table no longer sends `change:dataset`; read the starting value from the instance (`ctrl.months`) instead of waiting for the first event. Svelte and Solid adapter API: `useCollectionAdapter` no longer takes the rest of the attributes — `joinBindings` chains them from the component's rest.
