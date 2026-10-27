---
'@soldy-ui/angular': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/svelte': minor
'@soldy-ui/webc': minor
'@soldy-ui/setup': minor
---

Same events on every platform, found by the new parity run. Angular: an output of an event with several arguments now emits their tuple, like `detail` in Web Components — `(soChangeActivation)` gives `[item, previous]`, `(soChangeSelection)` gives `[selected, changed]`; read the first element where you used `$event` directly. Vue: the consumer no longer hears a component's teardown (`v-model:items` of a `v-if`-ed owner is no longer emptied), and Icon with a glyph component in `tag` hands its node to the plugins. Web Components: a removed element sends no events. Svelte: the markup items joining while mounting reach `onItemAdded` and the other handlers. React: typing after a choice in Select goes after the chosen text. Markup groups (`Menu.Group`, `ListBox.Group`, `Select.Group`) have their label from their first item on React.
