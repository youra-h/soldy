---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/plugins': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/angular': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/webc': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/icons-material': minor
---

Пакеты переехали в скоуп `@soldy-ui`: прежний скоуп занят в npm чужой учётной записью. Адаптеры названы по фреймворку, без повторения слова ui — `@soldy-ui/vue`, `@soldy-ui/react`, `@soldy-ui/angular`, `@soldy-ui/svelte`, `@soldy-ui/solid`, `@soldy-ui/webc`. Остальные пакеты сохранили прежние имена в новом скоупе: `@soldy-ui/core`, `@soldy-ui/setup`, `@soldy-ui/plugins`, `@soldy-ui/theme-oren`, `@soldy-ui/icons-material`. Как обновиться: сменить скоуп в импортах и в манифесте, у адаптеров дополнительно убрать из имени пакета префикс `ui-`.
