---
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
---

`ref` потребителя получает корень компонента — узел, на который ложатся его класс и атрибуты, — у всех компонентов React, Solid и Svelte, у полей тоже: у Input, CheckBox, Switch и RadioGroup.Item это корень, а не `<input>` (до поля — `ref.querySelector('input')`), у таблицы React — её окно `div.so-table__viewport`. React: `ref` — проп компонентов (`Ref<Element>`), его отдают так же, как узлу: функции — узлом, при снятии — её очисткой или `null`, объекту — в `current`; сменившийся между рендерами `ref` корень к `TElementPlugin` не перепривязывает. Ломающее для Solid: `ref` поля раньше получал `<input>`, теперь — корень поля; тип `TFieldRef` и второй аргумент `fieldText` удалены. Svelte: новый связываемый проп `ref` — `<Button bind:ref={button} />` (`bind:this` у компонента даёт экземпляр, а не узел), при снятии — `null`; setup-функции компонентов принимают третьим аргументом приёмник корня.
