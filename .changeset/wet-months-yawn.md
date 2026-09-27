---
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
'@soldy-ui/angular': patch
'@soldy-ui/webc': patch
---

Рантайм адаптера принимает собранный контекст — `adapter.attach()` при инициализации компонента (Angular — в `ngOnInit`, Web Components — в `connectedCallback`), парой к `destroy()`.
