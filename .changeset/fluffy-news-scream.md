---
'@soldy/core': patch
'@soldy/plugins': patch
'@soldy/setup': patch
'@soldy/ui-vue': patch
'@soldy/theme-oren': patch
---

Popover: новый компонент (Vue) — панель с произвольным содержимым у триггера, паттерн немодального диалога APG. Триггер кладут в слот `trigger`: связку с панелью (`aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`) и вид «нажат» (`data-selected`) он получает в scope — наборами `triggerAria` и `triggerDataset`. У панели `role="dialog"`, имя — `aria_label` или `aria_labelledBy`. Пропсы: `open` (v-model), `closable` и `closeLabel` — кнопка закрытия в углу панели, `lazyMount` — не монтировать содержимое до первого открытия, `placement` — сторона и выравнивание у триггера. При открытии фокус уходит в панель; закрытие крестиком, Escape или самим содержимым возвращает его на триггер, нажатие и фокус мимо закрывают без возврата; Tab ходит так, будто панель стоит в документе сразу за триггером. Тема oren рисует панель, область содержимого и крестик (`.s-popover`, `.s-popover__panel`, `.s-popover__content`, `.s-popover__close`). Frame пишет номер своего слоя в `data-layer` — тот же, что `zIndex`, — и получает слой сразу, если создан видимым: раньше такой Frame стоял с `z-index: 0`.
