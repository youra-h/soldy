---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
---

id в разметке строят плагины от id монтирования, ядро их не строит. Удалены IComponentView.idBase, опция конструктора idBase и второй аргумент конструктора компонентов ядра (IComponentOptions), TFactoryExtension.bindIdBase. Адаптер передаёт useId опцией контекста mountId, плагины строят id через ctx.createId(part). Части без экземпляра — живые наборы ядра: triggerAria (Popover, Tooltip), titleAria, bodyAria, listAria у Select вместо list_aria фасада, contentAria у Accordion.Item вместо content_aria. Поле Input, CheckBox, Switch без своего id — без атрибута.
