---
'@soldy/accessor': minor
'@soldy/setup': minor
---

Связка `bindComponent` — фасад над `TStateStore` (ядро → фреймворк), `TInputWriter` (фреймворк → ядро) и `TEventRelay` аксессора (события без повторов; им же пользуется `TExternalPlugins`). `pluginProps` — свой приёмник входа, а не ветка в записи. С `ISurfaceProp` снята копия `default`: снятый проп сбрасывает `TProperty.reset`. Методы связки для адаптеров не изменились.
