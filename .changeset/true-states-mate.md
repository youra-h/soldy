---
'@soldy-ui/react': patch
---

ProgressSpinner в адаптере React: индикатор выполнения кольцом — доля готового (`value` на шкале `min`–`max`) или бег, пока она неизвестна (`indeterminate`). Роль `progressbar` с `aria-value*`, `data-indeterminate`, доля переменной `--s-progress-spinner-fraction` и рисунок под `aria-hidden` — те же, что во Vue; имя — `aria_label` или `aria_labelledBy`. Ожидание без доли, которое раньше давал Spinner, — то же кольцо с `indeterminate`. Раскладка корня (`toRootProps`, `toRootLayout`) принимает последним аргументом стиль-выход компонента: он ложится поверх стиля плагина раскладки и под стилем потребителя, а `display: none` скрытого корня — поверх всех.
