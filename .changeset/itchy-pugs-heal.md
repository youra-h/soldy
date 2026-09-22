---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/plugins': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Новый компонент `Label` — подпись контрола: текст (проп `text` или слот `text`) рядом с CheckBox, Switch или радио в слоте `default`, сторона текста — `position` (`start`, `end`, `top`, `bottom`). Связь — вложением, без `for` и `id`: клик по тексту переключает контрол, а текст становится его доступным именем. Радио внутри подписи рисуется с `tag="span"` — его корень тоже `label`; вложенный `label` ловит `TLabelNestedWarnPlugin` предупреждением в консоль. Тема oren рисует стороны, размер текста и выключенную подпись.
