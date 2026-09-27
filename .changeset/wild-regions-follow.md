---
'@soldy-ui/react': patch
'@soldy-ui/setup': patch
---

React: Tabs и Accordion. Tabs — набор табов с частями `Tabs.Item` и `Tabs.Content` (плоские `TabsItem` и `TabsContent`): табы — детьми или из `items` со слотами `item`, `item-leading`, `item-trailing`; панели — в слоте `content`, панель показана, пока активен таб того же `value`. ARIA-связка «таб ↔ панель», клавиатура по APG Tabs (стрелки, `Home`/`End`, `Delete`) и кнопка закрытия (`closable`) — как у Vue. Accordion — секции `Accordion.Item` (плоский `AccordionItem`) детьми или из `items` со слотами `item`, `item-leading`, `item-trailing`, `item-content`; `mode="multiple"` держит раскрытыми несколько. Табы и секции разметки входят в коллекцию при коммите. Панель Tabs (`TTabsContentBindingExtension` в `@soldy-ui/setup`) подписывается на движок и своё `value`, когда адаптер принимает компонент (`attach`), а не при сборке: в React сборка идёт на рендере, и отброшенный рендер оставлял бы на шине движка лишнего подписчика.
