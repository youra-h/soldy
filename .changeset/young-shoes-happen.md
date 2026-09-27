---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/react': patch
---

React: StrictMode и `<Activity>` пересобирают контексты живого компонента на том же инстансе. Раньше без `ctrl` у пересборки был новый инстанс: список из данных после `<Activity>` терял выбор пользователя, а готовый движок (`engine`) получал второго владельца — в консоль уходило «движок уже привязан к другому компоненту», а `value`, `size`, `variant` и `disabled` элементов оставались у прежнего инстанса. Пропсы разметки пересборка пишет снова, как внешнему `ctrl`: значение, записанное кодом поверх разметки, возвращается к разметке.

Готовый движок переходит к списку, смонтированному заново (Vue `v-if`, условие в разметке React). Фасад держит движок, пока его монтирование принято (`retain` и `release` зовёт `TCollectionExtension` на `attach` и `destroy` контекста); следующий владелец берёт отпущенный движок, снимает расширения прежнего (`TCollectionEngine.remove`) и его фасад (`destroy`) и ставит свои. Владельческие расширения подписываются через `TBaseExtension._listenTo`, и их снимает `destroy()`. Новое в API: `TCollectionComponent.retain()`, `release()` и `destroy()`, `TCollectionEngine.remove()`, `IExtension.destroy()`, `TItemContextRegistry.release()`; `TCollectionOwner` в `@soldy-ui/setup` требует `retain()` и `release()`.
