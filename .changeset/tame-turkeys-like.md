---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/plugins': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Textarea: новый компонент (Vue) — многострочное поле с контрактом Input и подписью от `Field`: `rows`, авторост `autoresize` до `maxRows`, счётчик символов `counter` с пределом `maxlength`. Новая строка локали `textarea.counter`: свою полную `TLocale` дополните ею или соберите через `extendLocale`.
