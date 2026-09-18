---
'@soldy/plugins': minor
'@soldy/setup': minor
'@soldy/theme-oren': minor
'@soldy/ui-vue': minor
'@soldy/ui-react': patch
'@soldy/ui-solid': patch
'@soldy/ui-svelte': patch
'@soldy/ui-webc': patch
'@soldy/ui-angular': patch
---

Плагины и расширения коллекций подключаются снаружи. Одному компоненту — из `bundle:create` / `engine:create`: плагин, поставленный в `bundle:create`, объявляется вместе с плагинами компонента. Всем компонентам типа — `usePlugins(TButton, [TTimerPlugin])` и `useExtensions(TTags, [(owner) => new TExt()])` из `@soldy/setup`; по умолчанию только компонентам пользователя, `{ scope: 'all' }` — и деталям разметки других компонентов (строка и крестик тега), которые библиотека помечает пропом `embedded`. Контракт компонента — пропсы, события и слоты — объявляет только дескриптор: внешний плагин его не расширяет. `usePlugins` принимает класс или класс с опциями (`{ ctor, options }`), настраивается плагин опциями регистрации, а обращаются к нему через его собственный API — из `bundle:create` или по ссылке, которую он сам о себе оставил.

Плагины уничтожаются при размонтировании: `destroy()` плагинов раньше не вызывался ни в одном адаптере. У `IPluginBundle` появились `created()` и `destroy()`, у `IAdapterContext` — `embedded`.

Тема объявляет своё поведение: `defineTheme` / `useTheme` в `@soldy/setup`, объект темы oren — `@soldy/theme-oren/setup`. `TTabsViewPlugin` переехал из `@soldy/plugins` в тему и снят с Tabs, событие `view:create` у Tabs пропало. Как обновиться: в точке входа приложения рядом с `import "@soldy/theme-oren"` подключить `useTheme(oren)` из `@soldy/theme-oren/setup`, иначе полосы под активным табом нет; импорт `TTabsViewPlugin` брать из `@soldy/theme-oren/setup`.
