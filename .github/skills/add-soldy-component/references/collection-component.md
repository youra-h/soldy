# Collection Components Reference

How collection-based components (Tabs, Accordion, ListBox, Select, Tags) differ from
plain components. Wired **only for Vue** — see `SKILL.md` → «Collection components».

Layers, facade hierarchy, driver access, naming and ARIA rules are covered in `AGENTS.md`
→ «Коллекции: слои и расширения (критично)» — read that section first, this file only adds
the file layout and the Vue wiring on top of it, using Tabs as the worked example.

## Folder layout

```
<component>/collection/
  types.ts                          extension map + engine type + props interfaces
  factory.ts                        extension sets (owner-less + owner-only) + <Name>Factory
  create.ts                         createEngine<Name>(options) — public entry with owner
  facade/{facade.class.ts,index.ts} owner facade
  extensions/<name>/                component-specific extensions (see AGENTS.md)
<component>/item/
  facade/{facade.class.ts,index.ts} item facade
```

## Composition — extension sets, not a monolithic factory

`packages/core/src/components/base/collection/create/internal.ts` exports the shared
building blocks every collection composes from:

- `baseExtensions(itemCtor?)` — `unique`, `meta`, `order`, `plain`, `batch` (+ `factory` if
  `itemCtor` given). Present in every collection.
- `activationExtensions(itemCtor?)` — base + `activation`. Tabs' model.
- `selectionExtensions(itemCtor?)` — base + `selection`. Accordion / ListBox / Select / Tags.
- `assembleEngine(set, items?)`, `createComponentEngine(...)`, `attachEngine(...)`,
  `resolveEngine(...)` — see below.

Tabs builds its own set on top of `activationExtensions` in `collection/factory.ts`. The set
is typed `TBaseExtensionSet`, not the bare `TExtensionSet`: it guarantees `batch`, which
`assembleEngine` relies on to fill the engine without a cast:

```ts
export const TABS_EXTENSIONS = (): TBaseExtensionSet<ITabsItem> => ({
  ...activationExtensions<ITabsItem>(TTabsItem),
  content: () => new TTabsContentExtension<ITabsItem>(),
})

export const TABS_OWNER_EXTENSIONS: TOwnerExtensionSet<ITabsItem, ITabs> = {
  tabs: (owner) => new TTabsExtension({ owner }),
}

export const TabsFactory = (owner: ITabs): TTabsCollection => {
  const engine = assembleEngine<ITabsItem>(TABS_EXTENSIONS())

  for (const build of Object.values(TABS_OWNER_EXTENSIONS)) engine.use(build(owner))

  return engine as TTabsCollection
}
```

The split — owner-less `TABS_EXTENSIONS` vs `TABS_OWNER_EXTENSIONS` (needs a `TTabs`
instance) — exists because a collection can be assembled without an owner (`createEngine`)
and handed to the component later; `resolveEngine` (below) uses both sets to fill in
whatever a supplied engine is missing.

`collection/create.ts` is the public entry, requiring an owner explicitly:

```ts
export function createEngineTabs(
  options: TCreateEngineOptions<ITabsItem> & { owner: ITabs },
): TTabsCollection {
  return createComponentEngine(
    'createEngineTabs',
    TABS_EXTENSIONS(),
    TABS_OWNER_EXTENSIONS,
    options,
  ) as TTabsCollection
}
```

`collection/types.ts` declares the extension map and the engine type:

```ts
export type TTabsCollectionExtensions<TItem extends ITabsItem = ITabsItem> = {
  factory: TFactoryExtension<TItem>
  unique: TUniqueExtension<TItem>
  meta: TMetaExtension<TItem>
  order: TOrderExtension<TItem>
  plain: TPlainExtension<TItem>
  batch: TBatchExtension<TItem>
  activation: TActivationExtension<TItem>
  tabs: TTabsExtension<ITabs, TItem>
  content: TTabsContentExtension<TItem>
}

export type TTabsCollection = TCollectionEngine<ITabsItem, TTabsCollectionExtensions>
```

## Facade base classes

Facades inherit the base matching their extension, not a similar-looking component — see
AGENTS.md → «Иерархия фасадов повторяет состав расширений»:

```
TCollectionComponent
└── TBatchCollectionFacade          batch      → Tabs
    └── TSelectionCollectionFacade  + selection → Accordion, Select, ListBox, Tags

TCollectionItemComponent
└── TOrderItemFacade                order      → Tabs.Item
    └── TSelectionItemFacade        + selected → Accordion/ListBox/Select/Tags.Item
```

Bases live in `packages/core/src/components/base/collection/facade/<extension>/`, file name
repeats the folder: `batch/batch.facade.ts`, `order/item/order-item.facade.ts`,
`selection/selection.facade.ts`, `selection/item/selection-item.facade.ts`.

Tabs has activation, not selection, so it stops at `batch` / `order` — there is no
activation base; the single implementation lives directly in `TTabsCollectionFacade`.

## Engine supplied from outside — `resolveEngine`

`CollectionDescriptor` (`packages/setup/content/descriptors/components/collection/collection.descriptor.ts`)
declares `engine: { type: Object }` — a plain, non-triggering input, the collection
equivalent of `ctrl` for a regular component. A caller may pass an already-assembled
engine; if not, the facade builds its own.

The facade resolves this **in the argument expression of `super()`**, not in the
constructor body — base facades already touch extensions in their own constructors
(`TSelectionCollectionFacade` relays `extensions.selection.events`), and those run before
the subclass body. See the JSDoc on `resolveEngine`
(`packages/core/src/components/base/collection/create/internal.ts`) for why the order
matters.

A facade never lists the events it forwards: it is a projection of its extensions, so it
relays each source whole with `relayAll`, and its event map is the intersection of the
source maps (AGENTS.md, «Карта событий выводится из источника, а не переписывается»):

```ts
// collection/types.ts
export type TTabsCollectionFacadeEvents = TBatchCollectionFacadeEvents<ITabsItem> &
  TActivationEvents<ITabsItem> &
  TTabsExtensionEvents

export type TTabsItemCollectionFacadeEvents = TOrderItemFacadeEvents &
  TActivationItemEventsExtension &
  TTabsItemEventsExtension
```

```ts
export class TTabsCollectionFacade extends TBatchCollectionFacade<
  ITabsItem,
  TTabsCollectionExtensions,
  TTabsCollectionFacadeEvents
> {
  constructor(
    props: TCollectionFacadeProps<ITabsItem> = {},
    options: TCollectionFacadeOptions<TTabsCollectionFacadeEngine, ITabs> = {},
  ) {
    super(
      {},
      {
        engine: resolveEngine(
          options,
          TABS_EXTENSIONS(),
          TABS_OWNER_EXTENSIONS,
          'Tabs',
          TabsFactory,
        ) as TTabsCollection,
      },
    )

    this.events.relayAll(this.extensions.activation.events)
    this.events.relayAll(this.extensions.tabs.events)
    this.applyProps(props)
  }

  get activeItem(): ITabsItem | undefined {
    return this.extensions.activation.activeItem
  }
  activate(item: ITabsItem): void {
    this.extensions.activation.activate(item)
  }
}
```

The item facade (`item/facade/facade.class.ts`) holds a `TItemContext` set by the adapter
extension layer and relays the item adapters' events the same way:

```ts
export class TTabsItemCollectionFacade extends TOrderItemFacade<
  ITabsItem,
  TTabsCollectionExtensions,
  TTabsItemCollectionFacadeEvents
> {
  override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
    super.setContext(context)
    if (!this._context) return
    this.events.relayAll(this._context.adapters.activation.events)
    this.events.relayAll(this._context.adapters.tabs.events)
  }

  get active(): boolean {
    return this._context?.adapters.activation.active ?? false
  }
  set active(value: boolean) {
    if (this._context) this._context.adapters.activation.active = value
  }
}
```

## Descriptors

Collection descriptors are regular `defineComponent` factories wrapped in
`defineDescriptor` — there is **no** `defineCollection` / `defineExtension`. `ctor`
points at the facade; `extends` reuses the base `CollectionDescriptor`. The contract is
declared inline in `contribution`; owner-level and item-level descriptors are separate.

- Base `CollectionDescriptor` (`packages/setup/content/descriptors/components/collection/collection.descriptor.ts`):
  `engine`, `items`, `shown` (protected), `trackBy` + engine/collection events
  (`engine:create`, `item:*` with their `*:before` hooks, `items:clear:before`, `change:count`,
  `reset`, `items:added`, `items:removed`, `change:shown`).
- Owner-level `TabsCollectionDescriptor`: `activeItem` (`protected: true`, triggers
  `change:activation`) + events `item:activated` / `item:deactivated` / `item:close`.
- Item-level `TabsCollectionItemDescriptor`: `active`, `order` (protected), `tab_closable`
  (protected, via `get`).

```ts
export const TabsCollectionDescriptor = defineDescriptor(() =>
  defineComponent({
    ctor: TTabsCollectionFacade,
    extends: CollectionDescriptor(),
    contribution: {
      props: { activeItem: { type: Object, protected: true, triggers: ['change:activation'] } },
      events: ['item:activated', 'item:deactivated', 'item:close'],
    },
  }),
)

export const TabsCollectionItemDescriptor = defineDescriptor(() =>
  defineComponent({
    ctor: TTabsItemCollectionFacade,
    contribution: {
      props: {
        active: { type: Boolean, triggers: ['change:active'] },
        order: { type: Number, protected: true, triggers: ['change:order'] },
        tab_closable: {
          type: Boolean,
          protected: true,
          get: (item: TTabsItemCollectionFacade) => item.closable,
          triggers: ['change:closable'],
        },
      },
    },
  }),
)
```

The owner component descriptor (`TabsDescriptor`) additionally wires the collection
plugins:

```ts
export const TabsDescriptor = defineDescriptor(() =>
  defineComponent({
    ctor: TTabs,
    extends: ControlDescriptor(),
    contribution: {
      props: {
        /* orientation, alignment, position, view, closable */
      },
    },
    plugins: [
      CollectionBundlesPluginDescriptor(),
      CollectionElementsPluginDescriptor(),
      TabsLayoutPluginDescriptor(),
      TabsActiveTabPluginDescriptor(),
      TabsKeyboardPluginDescriptor(),
      DragPluginDescriptor(),
    ],
  }),
)
```

## Plugins (collection access)

- `TCollectionBundlesPlugin` — registry of item bundles (`uid → IPluginBundle`) + engine
  reference (`bindEngine`, `register`, `unregister`, `getByUid`, `getAll`). Emits
  `engine:bound`.
- `TCollectionElements` (extends `TCollectionBundlesAccess`) — DOM elements by
  uid/item/index via `bundle.get(TElementPlugin)`.

They are installed on the owner component; the engine is bound from the adapter layer via
`bindEngine`.

## Adapter extensions

- `TCollectionExtension` (owner) — facade mode: reads `context.instance.engine`, calls
  `bundles.bindEngine(engine)`, provides `ITEM_CONTEXT_ELEVATOR` (engine down) and
  `COLLECTION_ENGINE_ELEVATOR` (register callback down).
- `TCollectionItemExtension` (item) — reads `ITEM_CONTEXT_ELEVATOR` (up), builds the
  `TItemContext`, then registers `(item, bundle)` through `COLLECTION_ENGINE_ELEVATOR`.

## Vue wiring

The owner setup creates **two adapter contexts sharing one bundle**, both through
`createVueAdapterContext` (`packages/ui/vue/src/adapter/common/`), not `createAdapterContext`
from `@soldy-ui/setup`: the wrapper strips Vue proxies from `ctrl` and from the top-level values of
`options`, so the component passes `props.ctrl` / `props.engine` as they are, without `toRaw`.
The eslint block `soldy/vue-components-no-framework` fails on an import from `'vue'` and on
`createAdapterContext` imported from `@soldy-ui/setup`. The facade context passes
`engine: props.engine` through — a caller-supplied engine wins, `resolveEngine` falls back to
building one otherwise:

```ts
import {
  TCollectionExtension,
  TDragAndDropCollectionExtension,
  TabsDescriptor,
  TabsCollectionDescriptor,
} from '@soldy-ui/setup'
import { TTabsCollectionFacade } from '@soldy-ui/core'
import type { ITabsCollectionProps } from '@soldy-ui/core'
import {
  useAdapter,
  useCollectionAdapter,
  VueElevatorFactory,
  createVueAdapterContext,
  type SetupContext,
} from '../../adapter'
import BaseTabs, { type TabsProps } from './base.component'
import { type ITabsComponentProps, type ITabs } from '@soldy-ui/core'

export default {
  name: '_Tabs',
  extends: BaseTabs,
  setup(props: TabsProps, { emit }: SetupContext) {
    const adapter = createVueAdapterContext(TabsDescriptor(), {
      ctrl: props.ctrl,
      props,
    })

    const refs = useAdapter<ITabsComponentProps, ITabs>(adapter, props, emit)

    const collectionAdapter = createVueAdapterContext(
      TabsCollectionDescriptor(),
      { props, options: { owner: adapter.instance, engine: props.engine } },
      { bundle: adapter.bundle },
    )
      .use(TCollectionExtension, { elevator: VueElevatorFactory })
      .use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

    const refsCollection = useCollectionAdapter<ITabsCollectionProps, TTabsCollectionFacade>(
      collectionAdapter,
      props,
      emit,
    )

    return { ...refs, ...refsCollection }
  },
}
```

`useCollectionAdapter` (`packages/ui/vue/src/adapter/runtime/useCollectionAdapter.ts`) is
built from the same parts as `useAdapter` (`useAdapterParts`) but leaves `ctrl` / `rootElement`
out of its result: under the facade they'd mean the facade instance and its (nonexistent)
root element rather than the component's — spreading them in `{ ...refs, ...refsCollection }`
would depend on spread order, which is exactly what broke before this helper existed (see the
JSDoc on `useCollectionAdapter`).

The item setup mirrors the two-context shape (`TabsItemDescriptor` +
`TabsCollectionItemDescriptor`, shared bundle, `TCollectionItemExtension`), but calls plain
`useAdapter` on both sides and spreads the item binding before the owner binding: both
bindings carry `ctrl` and `rootElement`, and the owner's, spread last, win.

`useAdapterParts` creates a `rootElement` ref and watches it **only when** the context's
bundle has `TElementPlugin`; the watch calls `adapter.bindElement`. A facade context shares
the component's bundle, so the parts give it a `rootElement` too: `useCollectionAdapter`
drops it from the result, and in the item setup the owner binding overrides it.

## Key files

- `packages/core/src/components/base/collection/engine/` — `TCollectionEngine`,
  `TCollectionStorageDriver`, standard extensions.
- `packages/core/src/components/base/collection/create/internal.ts` —
  `baseExtensions`/`activationExtensions`/`selectionExtensions`, `assembleEngine`,
  `createComponentEngine`, `attachEngine`, `resolveEngine`.
- `packages/core/src/components/base/collection/facade/` — `TCollectionComponent`,
  `TCollectionItemComponent`, and the `batch`/`order`/`selection` facade bases.
- `packages/core/src/components/custom/tabs/collection/{types.ts,factory.ts,create.ts,facade/facade.class.ts}`
  and `tabs/item/facade/facade.class.ts`.
- `packages/setup/content/descriptors/components/collection/collection.descriptor.ts` — base
  `CollectionDescriptor`.
- `packages/setup/content/descriptors/components/tabs/collection.descriptor.ts` — concrete Tabs
  collection descriptors.
- `packages/setup/content/extensions/collection/` — `TCollectionExtension`,
  `TCollectionItemExtension`.
- `packages/plugins/src/custom/collection/` — `TCollectionBundlesPlugin`,
  `TCollectionElements`.
- `packages/ui/vue/src/adapter/runtime/useCollectionAdapter.ts` — `useCollectionAdapter`.
- `packages/ui/vue/src/components/tabs/{setup.component.ts,item/setup.component.ts}`.
