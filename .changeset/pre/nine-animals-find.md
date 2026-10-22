---
'@soldy-ui/svelte': minor
---

Svelte: лифт сборки — `useElevator()`, `SvelteElevatorFactory` удалён; `up()` отдаёт значение предка и после своего `down()`. Своя коллекция на адаптере: `const elevator = useElevator()` в начале setup вместо `SvelteElevatorFactory`.
