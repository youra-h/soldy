---
'@soldy-ui/webc': patch
---

Web Components: тип элемента (`TButtonElementProps` и соседи) выводится из контракта дескриптора, как пропсы React, Solid и Svelte. В нём появились свойства пропов плагинов дескриптора — `el.aria_label`, `aria_labelledBy`, `aria_describedBy`, у Frame `anchor_anchor`, `anchor_placement` и остальные пропсы якоря — и пропсы связки `pluginProps` и `embedded`. В браузере они работали и раньше, а в TypeScript запись `button.aria_label = 'Сохранить'` не компилировалась, и приходилось писать атрибут строкой; якорь атрибутом не задать вовсе. Общий тип свойств элемента — `TSoldyElementProps<typeof XDescriptor, HTMLXElement>`: пропсы дескриптора без свойств, которые у элемента есть по тегу, без `HOST_PROPS` и без `ctrl`.
