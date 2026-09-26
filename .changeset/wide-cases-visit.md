---
'@soldy-ui/theme-oren': patch
---

Из пакета убран пустой файл `dist/theme-oren.js`: стили темы собираются без режима библиотеки Vite, и сборка CSS кладёт в `dist` один `index.css`. Ни одна точка входа на этот файл не вела — `import '@soldy-ui/theme-oren'` и `@soldy-ui/theme-oren/setup` работают как раньше. Из конца `index.css` пропал служебный комментарий сборщика `/*$vite$:1*/`.
