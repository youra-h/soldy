---
'@soldy-ui/svelte': patch
'@soldy-ui/solid': patch
---

Svelte and Solid: the consumer no longer hears a component's teardown. The markup items leaving the collection no longer send `onChangeItems` with an ever shorter list (a consumer keeping it in its state lost the list with a hidden owner), nor the unbinding of its root (`onElementRemoved`). On Svelte the blur of a removed focused node still comes, as on Web Components: the framework removes the nodes before any hook.
