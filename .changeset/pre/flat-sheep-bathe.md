---
'@soldy-ui/core': minor
---

Перемещение на место вне коллекции больше не шлёт `item:moved` и `change:items`. Ломающее: `plain.move` и `TMoveCommand` не принимают старое место, уберите третий аргумент.
