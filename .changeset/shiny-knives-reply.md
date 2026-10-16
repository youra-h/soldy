---
'@soldy-ui/webc': patch
---

Web Components: ListBox — `<div is="so-list-box">` с элементами `<div is="so-list-box-item">`, элементы из данных с распорками окна и образцы слотов `item-*`. Строка элемента — Button на `div`, `<div is="so-button-div">`: одно имя элемента расширяет один тег, и кнопку на другом теге регистрирует фабрика `registerButtonTag(tag)` под именем `so-button-<тег>` — с тем же описанием элемента, что у `<button is="so-button">`; тип такой кнопки — `TButtonElementProps<HTMLDivElement>`. Выключенный пункт списка остаётся фокусируемым и объявляется через `aria-disabled`.
