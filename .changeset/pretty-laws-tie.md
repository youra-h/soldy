---
'@soldy-ui/plugins': patch
---

Плагины слоя оверлея — `TDismissPlugin`, `TOverlayFocusPlugin` с наследниками, `TScrollLockPlugin` и `THideOutsidePlugin` — снимают подписку на открытость владельца в `destroy()`: свой `ctrl`, переживший перемонтирование, больше не копит обработчики уничтоженных плагинов. У `IOverlayOpenState` появился `unbind()`.
