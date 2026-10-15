---
'@soldy-ui/webc': minor
'@soldy-ui/angular': minor
---

Префикс `so` — у каждого события, которое адаптер отдаёт туда, где его слышит и DOM: у событий Web Components и у выходов Angular, без исключений. Префикс говорит, чьё это событие, поэтому стоит у всей категории, а не у имён, что совпали бы с событием браузера: угадывать, у каких событий он есть, не нужно. Разделитель — тот, что в схеме имён адаптера: `:` у Web Components, camelCase у Angular.

Web Components: событие элемента — `so:` и полное имя ядра: `so:show`, `so:hide`, `so:ready`, `so:show:before`, `so:element:ready`, `so:action:press`, `so:change:disabled`, `so:bundle:create`, `so:plugin:event`, а с портом полей, Select и коллекций — `so:input`, `so:open`, `so:close`, `so:reset`. Ломающее: слушатели на элементах soldy переименуйте — `addEventListener('action:press', …)` → `addEventListener('so:action:press', …)`, `show` → `so:show`; под прежним именем событие больше не приходит, и ошибки об этом нет.

Angular: префикс `so` — у каждого выхода, а не только у события из одного слова: `elementReady` → `soElementReady`, `actionPress` → `soActionPress`, `changeValue` → `soChangeValue`, `inputValue` → `soInputValue`, `showBefore` → `soShowBefore`, `bundleCreate` → `soBundleCreate`, `pluginEvent` → `soPluginEvent`; `soInput`, `soShow`, `soHide` и `soReady` остались прежними. Ломающее: привязки `(actionPress)`, `(changeValue)` и остальные составные переименуйте в `(soActionPress)`, `(soChangeValue)` и т. д. — старую привязку шаблон не отвергнет: Angular примет её за событие DOM, и обработчик молча перестанет вызываться; подписка из кода (`button.actionPress.subscribe(…)`) перестанет компилироваться.
