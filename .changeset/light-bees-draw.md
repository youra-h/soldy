---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
---

Tooltip: проп `type` — чем подсказка служит триггеру. `description` (по умолчанию, как раньше) — описанием: `triggerAria` отдаёт `aria-describedby` на панель. `label` — именем: `triggerAria` отдаёт `aria-labelledby` на ту же панель, `aria-describedby` не ставится. Это режим кнопки-иконки без текста: `aria_label` ей не нужен, и скринридер не читает один текст дважды — как имя и как описание. Панель от режима не зависит: `role="tooltip"`, всегда в документе. Смена `type` на лету шлёт `change:type` (во Vue — и `update:type`) и переключает ссылку триггера.
