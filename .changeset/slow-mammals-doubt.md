---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
---

Язык и строки библиотеки — локаль поддерева, а не пропсы. Сняты пропсы со строками: `closeLabel` (Dialog, Drawer, Popover, Tabs.Item, Tags.Item), `maximizeLabel` (Dialog), `clearLabel` (Input, DateInput, Select), `prevLabel` и `nextLabel` (Scroller, Calendar), `prevYearLabel`, `nextYearLabel`, `prevYearsLabel` и `nextYearsLabel` (Calendar), `triggerLabel`, `startLabel` и `endLabel` (DatePicker), `selectAllLabel` (Table). `locale` у Calendar, DateInput, DatePicker и Table больше не вход.

Как обновиться: оберните приложение — на сервере тоже, в каждом запросе — провайдером локали адаптера:

```vue
<LocaleProvider :locale="ruRU">
  <App />
</LocaleProvider>
```

Локаль — `{ tag, translations }` из `@soldy-ui/plugins`: тег BCP 47 для Intl и строки библиотеки, данные без функций (место имени части — `{name}`). Готовые — `enUS`, `ruRU`, `zhCN`, `frFR`, `esES`, `arEG`; свою пишут объектом типа `TLocale` или собирают поверх готовой — `extendLocale(enUS, { tag: 'mn-MN', translations: { modal: { close: 'Хаах' } } })`. Смена пропа провайдера доезжает до компонентов на лету, без перемонтирования; вложенный провайдер даёт поддереву свой язык; без провайдера — английский.

В ядре строк больше нет: наборы кнопок (`closeAria`, `maximizeAria`, `prevAria`, `nextAria`, `clearAria`) — живые `TAria`, имена в них пишут плагины имён (`TNamesPlugin` и наследники). Тег в `locale` ядра пишет `TLocalePlugin`. Контексту сборки локаль приходит опцией `locale` (`createAdapterContext`), плагину — `IPluginContext.locale`.
