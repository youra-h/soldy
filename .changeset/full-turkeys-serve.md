---
'@soldy-ui/angular': minor
---

Angular: событие ядра из одного слова — выход с префиксом `so`: `input` → `soInput`, `show` → `soShow`, `hide` → `soHide`, `ready` → `soReady`. На `(x)` у элемента Angular слушает и выход `x`, и событие DOM `x`, поэтому `(input)` на поле получал два вызова на нажатие — событие ядра и всплывшее событие браузера. Ломающее: `(input)` на `<so-input>`, `<so-check-box>` и `<so-switch>` — теперь только событие браузера, как на нативном `<input>`, событие ядра — `(soInput)` (или `(inputValue)`, `(changeValue)`); `(show)`, `(hide)` и `(ready)` переименуйте в `(soShow)`, `(soHide)` и `(soReady)` — старую привязку шаблон не отвергнет: Angular примет её за событие DOM, и обработчик молча перестанет вызываться. Составные имена (`elementReady`, `changeValue`) не изменились.
