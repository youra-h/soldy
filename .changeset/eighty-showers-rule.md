---
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/theme-oren': patch
---

Отметка CheckBox — svg иконки по роли без компонента Icon: смена отметки больше не собирает контекст и плагины иконки. Размер отметке даёт тема флажка (s-check-box\_\_mark). Во Vue компонент иконки роли (`useIcon`) один на роль
