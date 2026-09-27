---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

ProgressSpinner: новый компонент (Vue) — индикатор выполнения кольцом, роль `progressbar`. Модель та же, что у ProgressLinear: `value` — сколько готово на шкале от `min` до `max` (по умолчанию 0 на шкале 0–100), `indeterminate` — доля неизвестна: кольцо бежит, `aria-valuenow` у него нет, а `value` хранится и возвращается, когда флаг снимают. Имя — `aria_label` или `aria_labelledBy`, текста и слотов у кольца нет. Размер и цвет — `size` и `variant`; оси и пропа толщины нет. Общая модель линии и кольца поднята в базу ядра `TProgress` с дескриптором `ProgressDescriptor`: `TProgressLinear` теперь её наследник, API линии прежний. Тема oren рисует кольцо SVG (`.s-progress-spinner`, `__ring`, `__track`, `__range`, `__runner`): диаметр — по шкале Spinner, доля — дуга от двенадцати часов по часовой (переменная `--s-progress-spinner-fraction`, число от 0 до 1), плавно едет к новому значению, а пока кольцо бежит, по дорожке крутится четверть кольца; в RTL кольцо не зеркалится. При `prefers-reduced-motion` доля встаёт сразу, а бег тот же. В режиме принудительных цветов штрихи — системными цветами. Без варианта кольцо `accent`, как Spinner и линия.
