---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
---

Язык и строки библиотеки задаёт приложение, а не разметка. Сняты пропсы со строками: `closeLabel` (Dialog, Drawer, Popover, Tabs.Item, Tags.Item), `maximizeLabel` (Dialog), `clearLabel` (Input, DateInput, Select), `moreLabel` (Tags), `prevLabel` и `nextLabel` (Tags, Scroller, Calendar), `prevYearLabel`, `nextYearLabel`, `prevYearsLabel` и `nextYearsLabel` (Calendar), `triggerLabel`, `startLabel` и `endLabel` (DatePicker), `selectAllLabel` (Table). `locale` у Calendar, DateInput, DatePicker и Table больше не вход.

Как обновиться: в точке входа приложения — на сервере тоже — задайте язык и строки вызовами из `@soldy-ui/plugins`:

```ts
useLocale('ru-RU')
useTranslations({
  modal: { close: 'Закрыть' },
  tabs: { close: (name) => `Закрыть вкладку «${name}»` },
})
```

Строки накладываются на английское умолчание; строка с именем части (`tabs.close`, `tags.close`, `field.clear`) — функция от имени. Английские умолчания и тип словаря — `DEFAULT_LOCALE`, `DEFAULT_TRANSLATIONS` и `TTranslations` из `@soldy-ui/core`. Своего языка и своих строк у компонента нет: `locale` и `translations` экземпляра ядра пишут при монтировании плагины `TLocalePlugin` и `TTranslationsPlugin`, смену — на лету, без перемонтирования.
