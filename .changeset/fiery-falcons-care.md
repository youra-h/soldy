---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Pagination — постраничная навигация: стрелки по краям, первая и последняя страницы видны всегда, между ними — `middleCount` страниц вокруг текущей (по умолчанию 3), на месте пропущенных — многоточие: `‹ 1 … 4 5 6 … 10 ›`. Страницы числовые — `⌈total / pageSize⌉`, номер в цифрах локали («12 345»), — или текстовые — список `pages` из `{ text, value? }`. Значение (`value`, `v-model`) — ключ текущей страницы, к страницам не прижимается. Корень — `nav`, имя ему даёт приложение (`aria_label`); у текущей — `aria-current="page"`, имена стрелок — из локали, новый раздел `pagination`. В ядре — `TPagination` и коллекция страниц окна (`createEnginePagination`, выход `cells`): в коллекции только видимые страницы, и страница, оставшаяся на экране, — тот же узел. Новый плагин имён `TPaginationNamesPlugin`. Во Vue — компонент `Pagination`, в теме oren — его стили.
