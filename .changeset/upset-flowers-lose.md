---
'@soldy-ui/plugins': minor
'@soldy-ui/webc': minor
---

Кнопка на не-нативном теге (`div`) делает клик из Enter (на keydown) и пробела (на keyup), как браузер у `<button>`: на клавишу приходит `click`, а `action:press` — из него; `preventDefault` у keydown на любом обработчике по пути нажатие отменяет.

Web Components: элементы soldy — нативные элементы своего тега (customized built-in). Вместо `<so-button>` пишется `<button is="so-button">`, вместо `<so-component-view>` — `<div is="so-component-view">`; из JS — `document.createElement('button', { is: 'so-button' })`. Кнопка — настоящая `<button>`: форму, `submitter`, `new FormData(form, submitter)`, Enter в поле, `form*`-атрибуты, `<fieldset disabled>`, `<label for>`, фокус и клавиатуру ведёт браузер. Для Safari пакет подключает полифил `@ungap/custom-elements`. Классы элементов собирает фабрика `SoldyElement(HTMLButtonElement, { descriptor, template, setup })` вместо наследования `TSoldyElement`; `defineProps`, реакции шаблона (`on`, `formAction`) и `TEventListener` убраны; `defineElement` принимает тег, который расширяется. Пробелы и комментарии вокруг слотов больше не глушат `text`; разметка со скриптом в `<head>` раскладывает слоты правильно.
