# Collection Components Reference

How collection-based components (Tabs, Collapse, List, ListBox) differ from plain components.

## Anatomy

A collection has three layers:

1. **Engine** — `TCollectionEngine<TItem, TExtensions>`: the `driver` (read-only storage + commands), the `extensions` map (`plain`, `batch`, `activation`, `order`, …), and `events` (engine-level events, e.g. `engine:create`).
2. **Owner facade** — a `TCollectionComponent` subclass (e.g. `TTabsCollectionFacade`) that owns the engine and exposes collection getters (`items`, `trackBy`, `activeItem`).
3. **Item facade** — a `TCollectionItemComponent` subclass (e.g. `TTabItemCollectionFacade`) that holds a `TItemContext` (lazy item adapters) and exposes item getters (`active`, `order`).

For Tabs, `packages/core/src/components/custom/tabs/collection/types.ts` declares the extension map and the engine type:

```ts
export type TTabsCollectionExtensions = {
	factory: TFactoryExtension<ITabItem>
	unique: TUniqueExtension<ITabItem>
	meta: TMetaExtension<ITabItem>
	order: TOrderExtension<ITabItem>
	plain: TPlainExtension<ITabItem>
	batch: TBatchExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

export type TTabsCollection = TCollectionEngine<ITabItem, TTabsCollectionExtensions>
```

## Factory

The engine is created in `collection/factory.ts`. Extensions are instantiated here — **not** in the descriptor:

```ts
export const TabsFactory = (instance: ITabs): TTabsCollection =>
	new TCollectionEngine({
		extensions: {
			factory: new TFactoryExtension<ITabItem>({ itemCtor: TTabItem }),
			unique: new TUniqueExtension<ITabItem>(),
			meta: new TMetaExtension<ITabItem>(),
			order: new TOrderExtension<ITabItem>(),
			plain: new TPlainExtension<ITabItem>(),
			batch: new TBatchExtension<ITabItem>(),
			activation: new TActivationExtension<ITabItem>(),
			tabs: new TTabsExtension({ owner: instance }),
		},
	})
```

## Facades

The owner facade (`collection/facade.ts`) owns the engine and relays collection events into its own `events`:

```ts
export class TTabsCollectionFacade extends TCollectionComponent<ITabItem, TTabsCollectionExtensions> {
	constructor(
		props: TCollectionFacadeProps<ITabItem> = {},
		options: TCollectionFacadeOptions<TTabsCollection, ITabs> = {},
	) {
		super({}, { engine: options.engine ?? TabsFactory(options.owner!) })
		// applies items/trackBy, relays batch / activation / tabs events
	}

	get items(): ReadonlyArray<ITabItem> { return this.extensions.batch.items }
	get activeItem(): ITabItem | undefined { return this.extensions.activation.activeItem }
	activate(item: ITabItem): void { this.extensions.activation.activate(item) }
}
```

The item facade (`tab-item/facade.ts`) holds a `TItemContext` set by the adapter layer and relays the item adapters' events:

```ts
export class TTabItemCollectionFacade extends TCollectionItemComponent<ITabItem, TTabsCollectionExtensions> {
	override setContext(context: TItemContext<ITabItem, TTabsCollectionExtensions>): void {
		super.setContext(context)
		if (!this._context) return
		this.events.relay(this._context.adapters.activation.events, ['change:active'])
		this.events.relay(this._context.adapters.order.events, ['change:order'])
	}

	get active(): boolean { return this._context?.adapters.activation.active ?? false }
	set active(value: boolean) { if (this._context) this._context.adapters.activation.active = value }
}
```

## Contributions

Owner-level and item-level contributions are separate factories.

- Base `CollectionContribution`: owner props `items` / `trackBy` + engine/collection events (`engine:create`, `item:*`, `change:count`, `reset`, `items:added`, `items:removed`).
- Owner-level `TabsCollectionContribution`: `activeItem` (`protected: true`, updated via `change:activation`).
- Item-level `TabsCollectionItemContribution`: `active`, `order` (protected), `tab_closable` (protected, via `get`).

```ts
export const TabsCollectionContribution = (): IContribution => ({
	props: { activeItem: { type: Object, protected: true, triggers: ['change:activation'] } },
	events: ['item:activated', 'item:deactivated', 'item:close'],
})

export const TabsCollectionItemContribution = (): IContribution => ({
	props: {
		active: { type: Boolean, triggers: ['change:active'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		tab_closable: { type: Boolean, protected: true, get: (i) => i.closable, triggers: ['change:closable'] },
	},
})
```

## Descriptors

Collection descriptors are regular `defineComponent` factories — there is **no** `defineCollection` / `defineExtension`. `ctor` points at the facade; `extends` reuses the base `CollectionDescriptor`.

```ts
export const TabsCollectionDescriptor = () =>
	defineComponent({
		ctor: TTabsCollectionFacade,
		extends: CollectionDescriptor(),
		contribution: TabsCollectionContribution(),
	})

export const TabsCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TTabItemCollectionFacade,
		contribution: TabsCollectionItemContribution(),
	})
```

The owner component descriptor (`TabsDescriptor`) additionally wires the collection plugins:

```ts
export const TabsDescriptor = () =>
	defineComponent({
		ctor: TTabs,
		extends: ControlDescriptor(),
		contribution: TabsContribution(),
		plugins: [
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			TabsLayoutPluginDescriptor(),
			TabsActiveTabPluginDescriptor(),
			TabsViewPluginDescriptor(),
			DragPluginDescriptor(),
		],
	})
```

## Plugins (collection access)

- `TCollectionBundlesPlugin` — registry of item bundles (`uid → IPluginBundle`) + engine reference (`bindEngine`, `register`, `unregister`, `getByUid`, `getAll`). Emits `engine:bound`.
- `TCollectionElements` (extends `TCollectionBundlesAccess`) — DOM elements by uid/item/index via `bundle.get(TElementPlugin)`.

They are installed on the owner component; the engine is bound from the adapter layer via `bindEngine`.

## Adapter extensions

- `TCollectionExtension` (owner) — facade mode: reads `context.instance.engine`, calls `bundles.bindEngine(engine)`, provides `ITEM_CONTEXT_ELEVATOR` (engine down) and `COLLECTION_ENGINE_ELEVATOR` (register callback down).
- `TCollectionItemExtension` (item) — reads `ITEM_CONTEXT_ELEVATOR` (up), builds the `TItemContext`, then registers `(item, bundle)` through `COLLECTION_ENGINE_ELEVATOR`.

## Vue wiring

The parent setup creates **two adapter contexts sharing one bundle**, calls `useAdapter` on each, and merges the refs:

```ts
const adapter = createAdapterContext(TabsDescriptor(), { ctrl: toRaw(props.ctrl), props })
const refs = useAdapter<ITabsComponentProps, ITabs>(adapter, props, emit)

const collectionAdapter = createAdapterContext(
	TabsCollectionDescriptor(),
	{ props, options: { owner: adapter.instance } },
	{ bundle: adapter.bundle, defaultExtensions: [] },
)
	.use(TCollectionExtension, { elevator: VueElevatorFactory })
	.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

const refsCollection = useAdapter<Record<string, any>, TTabsCollectionFacade>(collectionAdapter, props, emit)

return { ...refs, ...refsCollection }
```

The item setup mirrors this: `TabItemDescriptor` + `TabsCollectionItemDescriptor` (shared bundle, `defaultExtensions: []`) + `TCollectionItemExtension`, then two `useAdapter` calls.

`useAdapter` creates a `rootElement` ref and watches it **only when** the adapter has `TPluginsBindingExtension` — the collection facade context (`defaultExtensions: []`) has none, so it does not expose a competing `rootElement`.

## Key files

- `packages/core/src/components/base/collection/engine/` — `TCollectionEngine`, `TCollectionStorageDriver`, extensions.
- `packages/core/src/components/base/collection/facade/` — `TCollectionComponent`, `TCollectionItemComponent`.
- `packages/core/src/components/custom/tabs/collection/{types.ts,factory.ts,facade.ts}` and `tabs/tab-item/facade.ts`.
- `packages/setup/contributions/components/collection/collection.contribution.ts` — base `CollectionContribution`.
- `packages/setup/contributions/components/tabs/collection.contribution.ts` — owner + item contributions.
- `packages/setup/descriptors/components/collection/collection.descriptor.ts` — base `CollectionDescriptor`.
- `packages/setup/descriptors/components/tabs/collection.descriptor.ts` — concrete Tabs collection descriptors.
- `packages/setup/adapter/extensions/collection/` — `TCollectionExtension`, `TCollectionItemExtension`.
- `packages/plugins/src/custom/collection/` — `TCollectionBundlesPlugin`, `TCollectionElements`.
- `packages/ui/vue/src/components/tabs/{setup.component.ts,tab-item/setup.component.ts}`.
