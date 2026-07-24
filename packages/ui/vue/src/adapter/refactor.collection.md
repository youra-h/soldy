# Проблемы рефакторинга Collection на Descriptor

## Контекст

Collection (`TCollection extends TEntity`) и его подтипы (activable, selectable) + CollectionItem используют Vue-специфичные механики, не вписывающиеся в архитектуру Descriptor → Adapter.

---

## Проблема 1: Provide/Inject — фреймворк-специфичный слой

`syncCollection` (родитель):
- `useProvideCollection(instance)`
- `useProvideCollectionPlugins((uid, bundle) => collectionItemPlugins?.register(uid, bundle))`

`syncCollectionItem` (ребёнок):
- `useInjectCollectionItem(instance)` — саморегистрация в коллекции
- `useInjectCollectionItemPlugins(instance.uid, plugins)` — регистрация плагинов

**Почему не ложится:** `provide`/`inject` — чисто Vue. В React/Solid другой API. Нужен абстрактный слой «родитель-ребёнок» в Descriptor.

---

## Проблема 2: DragAndDrop — условная активация плагина

```ts
if (useInjectDragContext()) {
    plugins.get(TDragPlugin)?.activate(instance)
}
```

**Почему не ложится:** Дескриптор предполагает статический состав плагинов. Здесь активация условная. Нужен механизм «ленивой активации».

---

## Проблема 3: Нестандартный track (patchItems/setItems + trackBy)

```ts
track(props, 'items', (items) => {
    if (items !== undefined) {
        if (props.trackBy) {
            instance.patchItems(items, props.trackBy)
        } else {
            instance.setItems(items)
        }
    }
})
```

**Почему не ложится:** `bindInput` делает `instance.prop = value`. Здесь вызывается `patchItems`/`setItems`. `trackBy` — Vue-level проп (из `ICollectionSource`, не из Core). Нужен кастомный `setValue`.

---

## Проблема 4: Мульти-триггеры для refs

```ts
useSyncProps(instance.events, {
    items: { value: () => instance.items, triggers: ['item:added', 'item:afterMove', ...] },
    count: { value: () => instance.count, triggers: ['item:added', 'item:afterMove', ...] },
})
```

**Почему не ложится:** Contribution предполагает `change:*` в `props[].triggers`. Здесь ref обновляется по событиям коллекции, а не по `change:items`.

---

## Проблема 5: Collection не TComponent

`TCollection extends TEntity`. Нет `rendered`/`visible`/`tag`/`classes`, нет Element/Instance/Ready плагинов. `useAdapter` завязан на `bindElement(el)` — коллекции это не нужно.

---

## Проблема 6: Item — ad-hoc проверка rendered

```ts
instance.events.on('free', (item) => {
    if ('rendered' in instance) {
        (instance as any).rendered = false
    }
})
```

CollectionItem не TComponent, но проверяет наличие `rendered`.

---

## Итого: что доработать

1. **Родитель-ребёнок** — provide/inject на уровне Descriptor
2. **Условные плагины** — ленивая активация по условию
3. **Кастомный setValue** — не просто `instance.prop = value`
4. **Мульти-триггеры** — ref по нескольким событиям
5. **Адаптер без bindElement** — для не-ComponentView сущностей
