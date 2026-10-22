---
'@soldy-ui/core': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/webc': minor
'@soldy-ui/angular': minor
---

`onChangeSelected` элемента коллекции (`ListBox.Item`, `Select.Item`, `Tags.Item`, `Accordion.Item`, `Table.Row`, флажки и переключатели `Menu`) и `onChangeActive` (`Tabs.Item`, `Tabs.Content`, `RadioGroup.Item`) приходят только элементу, чьё состояние сменилось, и несут новое значение: `onChangeSelected={(selected) => …}`. `change:selection` владельца вторым аргументом отдаёт элементы, чья отметка сменилась, `change:activation` — прежний активный; в Web Components `detail` этих двух событий — пара: где читали `detail`, читайте `detail[0]`.
