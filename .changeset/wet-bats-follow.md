---
'@soldy-ui/theme-base': minor
---

Each part of the shared layer lives in its own sublayer of `so` (`so.button`), declared in order before any rule: a later part wins over an earlier one whatever the specificity, so a theme may cut the layer into stylesheets per component and an application may load them in any order.
