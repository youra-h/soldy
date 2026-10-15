---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

CSS-классы сменили префикс `s-` на `so-` — тот же, что у Custom Elements, селекторов Angular и событий: `class="so-button"`, `.so-tabs__list`, `.so-input--clearable`. Вместе с ними тот же префикс сменили кадры анимаций темы (`@keyframes s-progress-pulse` — теперь `so-progress-pulse`) и запасной id монтирования, от которого набор плагинов строит id в разметке без адаптера (`so-<n>`). Свои стили, переопределения темы и селекторы в коде и тестах (`querySelector('.s-button')`) переименуйте: классов `s-*` библиотека больше не ставит. Переменные CSS (`--s-*`) не менялись.
