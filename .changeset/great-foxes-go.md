---
'@soldy-ui/angular': minor
---

Angular: поля, ListBox, Tabs, их элементы, элемент Accordion и Table пишутся атрибутом на обычном теге, как Button: CheckBox и Switch — на `span` (`<span so-check-box>`), остальные — на `div` (`<so-input>` → `<div so-input>`). Свой тег остался только у `<so-component>`, `<so-virtual>`, `<so-drag-and-drop>`. Привязки и слушатели на компоненте (`[attr.x]`, `[title]`, `(focus)`) доходят до внутреннего узла, как у Vue и React. Как обновиться: заменить теги (`<so-input …/>` → `<div so-input …></div>`) и добавить `provideAttrs()` в `providers` `appConfig` — на сервере и в браузере; без него эти компоненты бросают ошибку. Компонент на элементе, в который его шаблон не отрисуется (`<input so-input>`, `<textarea so-textarea>`), — тоже ошибка. Новая peer-зависимость — `@angular/platform-browser`.
