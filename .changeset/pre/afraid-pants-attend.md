---
'@soldy-ui/vue': minor
---

Vue: state no longer keeps a `shallowRef` per property — Vue tracks only what the markup reads, and collection facades no longer create an unbound root ref. Breaking for custom components on `useAdapter`: the binding is a live view, spreading it copies the values once. Return it from `setup()` as is, join a component with its facades via `joinBindings(owner, ...facades)`, add own values with `extendBinding(binding, values)`.
