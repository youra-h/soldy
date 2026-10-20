---
'@soldy-ui/svelte': patch
'@soldy-ui/setup': patch
---

Svelte: Tags (`<Tags.Item>` или `items`, выбор, крестики, `wrap`/`scroll`) и Select (`<Select.Item>`, `<Select.Group>` или `items`, `editable`, отбор, теги в `multiple`, окно `Virtual`). Атрибуты Select, кроме класса и стиля, — на `<input>` поля. Scope слота `default` у Tags — `shown` только для чтения (`ReadonlyArray`), как его отдаёт коллекция.
