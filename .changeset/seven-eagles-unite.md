---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/plugins': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
---

Владелец коллекции — опция движка: engine.options.set({ owner }) / get / watch, а не аргумент конструкторов расширений. Движок переживает компонент и переходит к следующему владельцу; второй живой владелец на одном движке — ошибка. Фабрики расширений (tabsExtensions и соседи) без аргументов, createEngine\* — owner необязателен; resolveEngine заменён completeEngine. Активацию и выбор можно отменить: item:activate:before (TActivateEvent) и item:select:before (TSelectEvent), activate/select/toggle возвращают boolean; отменённое value откатывается к выбору. Тема oren: выключенный активный таб приглушён, как остальные.
