---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/icons-material': patch
'@soldy-ui/icons-lucide': patch
'@soldy-ui/theme-base': patch
'@soldy-ui/theme-oren': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
'@soldy-ui/angular': patch
'@soldy-ui/webc': patch
---

Every package declares `sideEffects`, so the application's bundler drops the modules a page does not use: a page with one button no longer pulls every component of the core, every plugin and every component of the adapter (React: 184 → 82 KB gzip of JS). The core, plugins, icons and adapters are `false`, the themes keep their stylesheets (`["*.css"]`), and `@soldy-ui/webc` is `true`: importing it defines every element, as before.
