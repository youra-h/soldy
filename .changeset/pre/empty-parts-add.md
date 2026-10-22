---
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
'@soldy-ui/angular': patch
'@soldy-ui/webc': patch
---

`focused = true` (проп или `ctrl.focused`) ставит фокус туда, где он у компонента живёт: в поле — у Input, NumberInput, Textarea, CheckBox, Switch, Rating, Slider, Select и радио, в узел списка — у ListBox, на таб-остановку — у Tabs; раньше запись меняла только свойство. У плагина действия — опция `focusTarget`, правило узла фокуса (`fieldOf`, `listOf`, `tabStopOf`).
