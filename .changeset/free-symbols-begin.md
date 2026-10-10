---
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

Angular и Web Components: теги компонентов сменили префикс `soldy-` на `so-` — `<so-button>`, `<so-component-view>`, в Angular ещё `<so-component>`. Переименуйте теги в шаблонах и разметке, а также строки в `querySelector`, `createElement` и ключах `HTMLElementTagNameMap`: старые имена не зарегистрированы, и `<soldy-button>` больше не кнопка. CSS-классы (`s-*`) и имена пакетов (`@soldy-ui/*`) не меняются.
