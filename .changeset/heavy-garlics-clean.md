---
'@soldy-ui/solid': minor
---

Коллекции ListBox, Tabs, Accordion и RadioGroup в Solid: части через точку (`Tabs.Item`, `Tabs.Content`, `ListBox.Item`, `Accordion.Item`, `RadioGroup.Item`) и плоские имена, элементы разметкой и данными (`items`). Лифт коллекций — слой значений: сборка берёт `useElevator()`, детям слой отдаёт `Elevate`. Ломающее: экспорт `SolidElevatorFactory` снят, а `TSolidElevator` работает только поверх слоёв `useElevator()`.
