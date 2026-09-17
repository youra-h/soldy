---
'@soldy/setup': minor
'@soldy/plugins': patch
---

`dismiss_enabled` у Select типизирован дескриптором: новый `IDismissPluginProps` передаётся третьим аргументом `definePlugin`, и шаблон проверяет значение пропа. Из `TDismissPluginProps` убран `dismiss_enabled`, в типе остался выход `dismiss_ownerAttribute`.
