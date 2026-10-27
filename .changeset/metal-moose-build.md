---
'@soldy-ui/vue': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/webc': minor
---

A component's own assembly no longer sends events: on Vue, Svelte, Solid and Web Components the consumer hears a component from its full assembly, as on React and Angular. What the collection facade writes into its owner while mounting is the starting state — Calendar no longer sends `change:months` (and Vue `update:months`) with the months it shows on mount, Table no longer sends `change:dataset`; read the starting value from the instance (`ctrl.months`) instead of waiting for the first event. Svelte and Solid adapter API: a component with collection facades binds its own context with the new `useOwnerAdapter` instead of `useAdapter`, and `joinBindings` starts the events of all its contexts.
