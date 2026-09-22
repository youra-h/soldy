---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/plugins': patch
'@soldy-ui/icons-material': patch
'@soldy-ui/theme-oren': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/angular': patch
'@soldy-ui/svelte': patch
'@soldy-ui/solid': patch
'@soldy-ui/webc': patch
---

Пакеты открыты к публикации: сняты private, добавлены publishConfig, files, README и LICENSE. Фреймворк адаптера стал peer-зависимостью, тема и иконки — devDependency: приложение выбирает их само, и второй копии Vue, React или Angular в нём больше не появится. Соседи по скоупу объявлены диапазоном ^0.1.0 вместо "любая версия".
