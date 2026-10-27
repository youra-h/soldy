---
'@soldy-ui/angular': patch
'@soldy-ui/svelte': patch
---

Angular and Svelte adapters keep less memory per mounted component: fewer signals, computeds and effects in the adapter wiring. In Angular, `state()`, `instance()`, `facade()` and `rootElement()` of the component base are methods now, called the same way, and only components that read slots query slot templates.
