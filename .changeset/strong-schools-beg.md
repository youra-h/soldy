---
'@soldy-ui/angular': patch
---

Angular: у выходов компонентов появился тип. Привязка события в строгом шаблоне приложения (`strictTemplates`, умолчание новых проектов Angular) — например `(actionPress)="onPress($event)"` у `soldy-button`, как в README, — раньше не компилировалась (TS7053: у класса компонента нет поля выхода). Теперь компилируется, а `$event` получает тип первого аргумента события ядра: `MouseEvent | KeyboardEvent` у `actionPress`, `boolean` у `changeVisible`. Тип дают сгенерированные базовые классы `TButtonSurface`, `TComponentViewSurface`, `TComponentSurface` — компоненты наследуют их, а не `TComponentBase`; `TStylableSurface`, `TControlSurface` и `TTextableSurface` — для своего компонента на этих дескрипторах; тип выхода — `TOutputEmitter`. `useOutputs` отдаёт пары «выход, полное имя события ядра» вместо списка имён.
