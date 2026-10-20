---
'@soldy-ui/plugins': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
'@soldy-ui/angular': patch
'@soldy-ui/webc': patch
---

Запись `focused = true` в одном такте со сменой остановки — листание Calendar, страница Pagination за окном, новый таб или тег — ставит фокус, как только узел новой остановки нарисован; раньше фокус не вставал, а `focused` оставался `true`.
