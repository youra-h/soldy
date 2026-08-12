Понял — ты намеренно убрал коллекцию из `TTabs`, потому что `TTabs` — это чистый компонент (ориентация, размер, вариант) и он ничего не должен знать о коллекции. Я добавил обратно, потому что relay-подход позволял бы `items` работать через стандартную contribution-систему. Но это искусственное связывание.

Вот варианты без coupling с `TTabs`:

---

## Вариант A: Всё в адаптерном слое (минимум новых механизмов)

`items` — НЕ contribution-проп. Объявляется вручную в `base.component.ts`. Логика связки — в `useVueCollection`.

```
@soldy/setup     TCollectionAdapterExtension  — создаёт коллекцию, elevator для slot-детей
@soldy/ui/vue    useVueCollection             — refs (items, activeItem) + watch :items prop
tabs/base         propsTabsExtra: { items: Array }  — просто Vue prop, без contributions
```

setup.component.ts:
```ts
const adapter = createAdapterContext(TabsDescriptor, { ctrl, props })
    .use(TCollectionAdapterExtension, {
        factory: (tabs) => new TCollection({
            extensions: {
                plain:      new TPlainExtension(),
                activation: new TActivationExtension(),
                tabs:       new TTabsExtension({ owner: tabs }),
            }
        })
    })

const colExt = adapter.get(TCollectionAdapterExtension)

return {
    ...useVue<ITabsProps, ITabs>(adapter, props, emit),
    ...useVueCollection(colExt, props),  // ← получает props.items и синхронизирует
}
```

`useVueCollection` внутри сам делает:
```ts
watch(() => props.items, (val) => {
    if (val) ext.collection.extensions.plain.setItems(val)
}, { immediate: true })
```

**Плюсы**: `TTabs` чистый, contributions не трогаем, `useSyncProps` не трогаем.
**Минусы**: `items` живёт вне contribution-системы — другой механизм для одного пропа.

---

## Вариант B: `defineCollection` — параллельный дескриптор

Новый DSL рядом с `defineComponent`:

```ts
const TabsCollectionDescriptor = defineCollection({
    factory: (tabs: TTabs) => new TCollection({ extensions: { ... } }),
    props: [
        { name: 'items',      source: 'engine',               triggers: ['change:items'] },
        { name: 'activeItem', source: 'extensions.activation', triggers: ['change:activation'], protected: true },
    ]
})
```

Рядом появляется `TCollectionAccessor` — аналог `TComponentAccessor`, но умеет читать из `engine.items` и `extension.activeItem`. `useSyncProps` работает с ним так же.

**Плюсы**: полная симметрия с компонентной системой, одна модель для всего.
**Минусы**: значительный объём новой инфраструктуры (defineCollection, TCollectionAccessor, интеграция в useSyncProps).

---

## Вариант C: `items` — contribution-проп без `TTabs`, через виртуальный "proxy-инстанс"

Создаётся тонкая обёртка, которая implement-ит контракт accessor'а для коллекции, не привязываясь к `TTabs`:

```ts
// Не TTabs, а отдельный объект-прокси
class TCollectionProxy {
    events = new TEvented()
    constructor(private col: TCollection<any, any>) {
        col.engine.events.on('change:items', (items) => this.events.emit('change:items', items))
    }
    get items() { return [...this.col.engine] }
    set items(val) { this.col.extensions.plain.setItems(val) }
}
```

`TComponentAccessor` видит его как обычный инстанс с `items` getter/setter. Но это снова relay — только не в `TTabs`, а в отдельном объекте.

---

## Что выбрать

| | A (Vue-слой) | B (defineCollection) | C (proxy) |
|---|---|---|---|
| TTabs чистый | ✓ | ✓ | ✓ |
| Единая модель | ✗ | ✓ | частично |
| Объём работы | минимум | много | средний |
| Гибкость (несколько коллекций) | сложно | легко | сложно |

Если коллекции у тебя только в Tabs (и немного в других компонентах) — **Вариант A** сейчас, с прицелом на **Вариант B** позже. Если архитектурно важна единая модель с самого начала — **Вариант B**.



Вопрос:
"Как мне видеться делать надо по Варианту B. нужен параллельный механизм, defineCollection, так как в текущую механику он не встраивается либо встраивается но с большим усложнением кода. Нужен свой TCollectionAccessor. Но есть замечания все таки вот эти вещи надо перенести в contributions props: [
        { name: 'items',      source: 'engine',               triggers: ['change:items'] },
        { name: 'activeItem', source: 'extensions.activation', triggers: ['change:activation'], protected: true },
    ]. Что я еще бы сделал, в впапке setup думаю надо сделать отдельную папку collection/contributions и collection/descriptors. Так как например tabs, collapse, listbox, select будет  в общей папке contributions,descriptors и в collection, где будет находиться описание собственных extension, например как у tabs есть свой собственный extension для коллекций #sym:TTabsExtension . Но пока остается вопрос как мы параллельный механизм с коллекциями будем встаривать в #sym:createAdapterContext #sym:useVue #sym:useEmits #sym:useProps #sym:useSyncEvents #sym:useSyncProps и т.д.?"


Ответ:
"Read memory

Отличный выбор. Теперь самый сложный вопрос — интеграция. Вот полный план.

---

## Ключевой принцип: **параллельный, не встроенный**

Ничего в существующей цепочке не меняется. Коллекция идёт рядом — те же паттерны, другой namespace.

```
Компонент:   createAdapterContext → useVue → useSyncProps / useSyncEvents
Коллекция:   createCollectionContext → useVueCollection → useSyncCollectionProps / useSyncCollectionEvents
```

---

## Новый `ICollectionProp` — ключевое отличие от `ICompiledProp`

```ts
interface ICollectionProp extends ICompiledProp {
  // 'engine' | { extension: 'activation' } | { extension: 'selection' }
  source: 'engine' | { extension: string }
}
```

`TCollectionAccessor` использует `source` чтобы знать, откуда читать значение и к чьим `events` подписываться:

```ts
getValue(prop: ICollectionProp): any {
  if (prop.source === 'engine') return [...this.collection.engine]
  const ext = this.collection.extensions[prop.source.extension]
  return ext?.[prop.name]
}

getEventSource(prop: ICollectionProp): TEvented {
  if (prop.source === 'engine') return this.collection.engine.events
  return this.collection.extensions[prop.source.extension]?.events
}

setValue(prop: ICollectionProp, value: any): void {
  if (prop.protected) return
  if (prop.source === 'engine') {
    this.collection.extensions.plain?.setItems(value)
  }
}
```

---

## Структура папок

```
setup/
  adapter/
    collection/                    ← NEW (контекст коллекции в адаптере)
      createCollectionContext.ts
      types.ts
      extensions/
        collection-item-elevator.extension.ts
        drag-and-drop.extension.ts

  collection/                      ← NEW (дескрипторы и контрибьюции)
    contributions/
      base/
        base-collection.contribution.ts   (items, activeItem — общие)
      tabs/
        tabs.collection.contribution.ts
      collapse/
        ...
    descriptors/
      base/
        define-collection.ts
        types.ts
      tabs/
        tabs.collection.descriptor.ts
      collapse/
        ...
```

```
ui/vue/src/adapter/
  runtime/
    useSyncProps.ts              ← без изменений
    useSyncEvents.ts             ← без изменений
    useVue.ts                    ← без изменений
    useSyncCollectionProps.ts    ← NEW
    useSyncCollectionEvents.ts   ← NEW
    useVueCollection.ts          ← NEW
  static/
    useProps.ts                  ← без изменений
    useEmits.ts                  ← без изменений
    useCollectionProps.ts        ← NEW
    useCollectionEmits.ts        ← NEW
```

---

## `createCollectionContext` — параллель `createAdapterContext`

```ts
// setup/adapter/collection/createCollectionContext.ts

export function createCollectionContext<T>(
  descriptor: ICollectionDescriptor<T>,
  owner: any,                // экземпляр TTabs (или другого компонента-владельца)
): ICollectionAdapterContext {
  const collection = descriptor.factory(owner)
  const accessor = new TCollectionAccessor(collection, descriptor.props, descriptor.events)
  const events = new TEvented<TAdapterEvents>()
  const extensionsMap = new Map<symbol, any>()

  const ctx: ICollectionAdapterContext = {
    collection,
    accessor,
    events,
    use(Ctor, opts?) { ... },
    get(Ctor)        { ... },
    destroy()        { events.emit('destroy'); extensionsMap.clear() },
  }
  return ctx
}
```

---

## Интеграция в `base.component.ts` и setup.component.ts

**`tabs/base.component.ts`** — build time:
```ts
export default {
  extends: ComponentView,
  emits: [
    ...useEmits(TabsDescriptor),
    ...useCollectionEmits(TabsCollectionDescriptor),   // items → update:items (если не protected)
  ],
  props: {
    ...useProps(TabsDescriptor),
    ...useCollectionProps(TabsCollectionDescriptor),   // items: Array, activeItem: Object
  },
}
```

**`tabs/setup.component.ts`** — runtime:
```ts
setup(props, { emit }) {
  const adapter = createAdapterContext(TabsDescriptor, {
    ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
    props,
  })

  const colCtx = createCollectionContext(TabsCollectionDescriptor, adapter.instance)
    .use(TCollectionItemElevatorExtension, { elevator: VueElevatorFactory })
    .use(TDragAndDropCollectionExtension,  { elevator: VueElevatorFactory })

  return {
    ...useVue<ITabsProps, ITabs>(adapter, props, emit),
    ...useVueCollection(colCtx, props, emit),          // items, activeItem как refs в шаблоне
  }
}
```

---

## Поток данных — теперь полный

```
Паттерн 1 (slot):
  TabItem.setup()
    → TCollectionItemExtension.up() → registerFn
      → TCollectionItemElevatorExtension.down() предоставил registerFn
        → plain.insert(item)
          → engine.events.change:items
            → TCollectionAccessor.getEventSource(itemsProp) = engine.events
              → useSyncCollectionProps → items.value = [...engine]

Паттерн 3 (:items prop):
  Vue watch на props.items (из useSyncCollectionProps.bindInput)
    → accessor.setValue(itemsProp, value)
      → plain.setItems(value)
        → engine.events.change:items → items.value обновился

Паттерн 2 (:ctrl):
  adapter.instance = переданный TTabs
  colCtx = createCollectionContext(descriptor, thatTabs)
    → factory(thatTabs) создаёт новую TCollection под этот экземпляр
    → items.value = [] изначально (коллекция пустая)
    → дальше пользователь наполняет через slot или :items
```

---

## Что полностью не трогаем

| Файл | Статус |
|---|---|
| `createAdapterContext` | без изменений |
| `useVue` | без изменений |
| `useSyncProps` | без изменений |
| `useSyncEvents` | без изменений |
| `useProps` / `useEmits` | без изменений |
| `TComponentAccessor` | без изменений |
| Все существующие дескрипторы/contributions | без изменений |

Параллельная система — это просто второй комплект тех же паттернов, который стыкуется с первым только в двух точках: `base.component.ts` (merge props/emits) и setup.component.ts (spread результатов)."
