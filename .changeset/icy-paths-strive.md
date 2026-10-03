---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
---

DateInput на сенсорных устройствах: касание пальцем или пером делает части даты редактируемыми — дату вводят с экранной клавиатуры, а нажатие мышью возвращает протяжку для выделения всей даты. Ввод экранной клавиатуры и композиция IME становятся командами ядра, текст частей по-прежнему пишет ядро. На iPhone и iPad части — текстовые поля, и имя поля входит в имя каждой части. Новое: плагины TDateInputTouchPlugin и TDateInputIdsPlugin, наборы частей segmentSets у TDateInput, у части в segments — attrs и name.
