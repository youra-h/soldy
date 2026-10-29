---
'@soldy-ui/theme-oren': patch
---

The values of `variant`, `view`, `shape` and `animation` now reach the types through `@soldy-ui/theme-oren/setup`, so `variant="accent"` type-checks when the stylesheet comes from Angular CLI `styles` or Nuxt `css`. README: where the stylesheet goes in each build.
