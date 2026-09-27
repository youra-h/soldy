---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
---

Готовый движок коллекции (`engine`) переходит к пересобранному компоненту. Фасад, уходя, отпускает движок (`TCollectionComponent.destroy()`, его зовёт `TCollectionExtension` на уничтожении контекста): владельческие расширения прежнего владельца снимают подписки (`TBaseExtension._listenTo` и `destroy()`) и отвязывают от него элементы, а следующий владелец ставит свои. Раньше движок помнил первого владельца навсегда: под React StrictMode и `<Activity>` и при повторном монтировании во Vue в консоль уходило «движок уже привязан к другому компоненту», а `value`, `size`, `variant` и `disabled` элементов оставались у уничтоженного. Владелец, собранный до ухода прежнего, ждёт и получает движок, когда тот уйдёт. Новое в API: `TCollectionEngine.remove()`, `TItemContextRegistry.release()`, `unbindDisabledFromOwner`, `unbindStyleFromOwner`; `TCollectionOwner` в `@soldy-ui/setup` требует `destroy()`.
