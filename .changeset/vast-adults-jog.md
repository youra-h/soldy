---
'@soldy-ui/core': patch
'@soldy-ui/vue': patch
---

`aria-selected` элементов ListBox пишет ядро (`TListBoxExtension`) в набор `aria`: у всех элементов, `false` — у невыбранных, как у Select и Tags. Шаблон Vue его больше не считает. Контекст Vue принимается (`attach()`) в `setup()` рантаймом `useAdapter` — там элементы коллекций и входят в неё; сами компоненты элементов этого шага не делают.
