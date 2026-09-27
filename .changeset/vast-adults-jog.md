---
'@soldy-ui/core': patch
'@soldy-ui/vue': patch
---

`aria-selected` элементов ListBox пишет ядро (`TListBoxExtension`) в набор `aria`: у всех элементов, `false` — у невыбранных, как у Select и Tags. Шаблон Vue его больше не считает; элементы коллекций Vue входят в неё вызовом `join()` в `setup()`.
