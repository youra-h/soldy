---
'@soldy-ui/vue': patch
---

Vue: the props of the components are type-checked in the templates of a Nuxt application too. The closed instance kept `$props` only while the application had no global with a pattern key, and Nuxt types a plugin that provides nothing with `$${string}`.
