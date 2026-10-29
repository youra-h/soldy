---
'@soldy-ui/theme-base': patch
'@soldy-ui/theme-oren': patch
'@soldy-ui/icons-lucide': patch
'@soldy-ui/icons-material': patch
---

Versioned on their own: a theme or an icon pack no longer shares the version of the library and depends on it by a range (`^` and a library version) instead of its exact version, so it keeps working with the library releases that do not break its contract. The icon packs take `@soldy-ui/setup` as a peer dependency now.
