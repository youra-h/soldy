---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
---

Tags с выбором (mode не none) — клавиатура по паттерну APG Listbox на roving tabindex: весь набор — одна остановка Tab (вход — на тег, где последним был фокус, иначе на первый выбранный, иначе на первый), ←/→ (в RTL наоборот) и ↑/↓ ведут по тегам по кругу, Home/End — к крайним, Delete и Backspace закрывают тег и переводят фокус к соседу. Клавиатуру даёт новый TTagsKeyboardPlugin, остановку Tab пишет TTagsExtension (tabStop, isEnabledTag, notifyFocus). Набор объявляет aria-orientation="horizontal", в multiple — aria-multiselectable. Кнопка закрытия с выбором выведена из порядка Tab. Без выбора строки тегов Tab больше не ловят (в том числе теги в поле Select), а крестик остаётся остановкой. Ломающее: TTagsItem.closeAria — теперь живой набор TAria, а не объект атрибутов; снимок — closeAria.valueOf(), об изменении сообщает событие change:closeAria.
