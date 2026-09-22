---
'@soldy-ui/setup': minor
---

События компонента в типах — только те, что адаптер пробрасывает: `DescriptorEvents` и `DescriptorAllEvents` дают карту событий класса ядра, суженную до имён из `events` и триггеров пропсов дескриптора и его `extends`. Ушли события, которые не срабатывали никогда: `change:present` у визуальных компонентов (у кнопки React, Solid и Svelte — колбэк `onChangePresent`), у владельцев коллекций — события движка (`item:added` и соседи): наружу их отдаёт коллекционная часть, и в её типе они остались. `defineComponent` сверяет имена в `events` и `triggers` с картой событий класса ядра: имя вне карты — ошибка компиляции дескриптора. У `IComponentContribution` и `IComponentDescriptor` появился параметр имён событий, проп в contribution компонента — `IComponentPropDefinition`.
