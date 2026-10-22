---
'@soldy-ui/webc': minor
---

События частей, которые рисует сам компонент, — страниц Pagination, групп ListBox, колонок Table и элементов из данных (`items`, `engine`) у ListBox, Tabs, Accordion, RadioGroup и Table — больше не всплывают до владельца и выше, как и события его деталей; `embedded` на всплытие больше не влияет. Как обновиться: слушать такое событие на самом элементе или брать событие владельца (`so:change:value`, `so:item:activated`, `so:item:close`). `useCollectionAdapter` больше не принимает контекст владельца: `useCollectionAdapter(adapter, host, onUpdate)`.
