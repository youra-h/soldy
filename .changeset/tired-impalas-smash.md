---
'@soldy-ui/angular': patch
---

Адаптер Angular объявляет `@angular/common` peer-зависимостью: код пакета его импортирует, а без объявления менеджеры пакетов со строгой изоляцией (Yarn PnP, pnpm без поднятия зависимостей) не давали адаптеру его найти. `@angular/compiler`, `@angular/platform-browser` и `rxjs` из peer-зависимостей убраны — адаптер их не импортирует
