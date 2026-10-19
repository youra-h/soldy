---
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
'@soldy-ui/angular': patch
'@soldy-ui/webc': patch
---

Поле формы Field в React, Solid, Svelte, Angular (`<div so-field>`) и Web Components (`<div is="so-field">`): подпись, подсказка и ошибка связаны с Input, CheckBox, Switch и RadioGroup внутри — `for` подписи или ссылка `aria-labelledby` у группы, справка в `aria-describedby`, ошибка — `aria-invalid` и `data-invalid` контрола. На корне Input, CheckBox и Switch теперь и `dataset` (`data-disabled`, `data-invalid`): по ним тема красит поле и подпись поля формы.
