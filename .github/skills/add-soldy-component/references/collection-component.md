# Collection Components Reference

How collection-based components (Tabs, Collapse, List, ListBox) differ from plain components.

## Anatomy

A collection is a `TCollection<TItem, TExtensions>` facade with an `engine` + a map of runtime extensions. Each extension is a core class (`TBatchExtension`, `TActivationExtension`, …) installed under a name.

For Tabs, `packages/core/src/components/custom/tabs/collection/types.ts` declares:

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

export type TTabsCollection = TCollection<ITabItem, TTabsCollectionExtensions>
```

## Input vs output (critical rule)

Keep them separate — do **not** intersect them into one owner type.

- **Input props** (what the template passes in) live on the props interface:
  - `ICollectionProps<TTabsCollection>` — the `engine` pass-through.
  - `IBatchCollectionProps<TItemProps, TItem>` — `items` / `trackBy`.
- **Item props** (child level): `IActivationCollectionItemProps` — `active`.
- **Output state** (what `useVueCollection` returns as refs) is **one flat interface**:

```ts
export interface ITabsCollectionOutput {
	items: ReadonlyArray<ITabItem>
	trackBy?: (item: ITabItem) => any
	activeItem: ITabItem | undefined
}
```

## Contributions

Owner-level and item-level contributions are separate factories.

- Owner-level (`ActivationExtensionContribution`): `activeItem` is `protected: true` — read-only in the parent template, updated via `change:activation`.
- Item-level (`ActivationItemExtensionContribution`): `active: Boolean` — reactive on each child.

```ts
export const ActivationExtensionContribution = (): IContribution => ({
	props: { activeItem: { type: Object, protected: true, triggers: ['change:activation'] } },
	events: ['item:activated', 'item:deactivated'],
})

export const ActivationItemExtensionContribution = (): IContribution => ({
	props: { active: { type: Boolean, triggers: ['change:active'] } },
})
```

## Extension descriptors

`defineExtension` takes `name`, optional `namespace`, `ctor`, `contribution` (owner-level) and `itemContribution` (child-level, namespaced).

```ts
export const ActivationExtensionDescriptor = () =>
	defineExtension({
		name: 'activation',
		ctor: TActivationExtension,
		contribution: ActivationExtensionContribution(),
		itemContribution: ActivationItemExtensionContribution(),
	})
```

Extensions that need per-instance construction use `optionsFactory` in the collection descriptor (not in the extension descriptor):

```ts
export const FactoryExtensionDescriptor = () =>
	defineExtension({ name: 'factory', ctor: TFactoryExtension, contribution: FactoryExtensionContribution() })
```

## Collection descriptor

`defineCollection({ extends, contribution, extensions })` merges base extensions first, then own ones. `extends` reuses the base `CollectionDescriptor` (unique/meta/order/plain/batch).

```ts
export const TabsCollectionDescriptor = () =>
	defineCollection({
		extends: CollectionDescriptor(),
		extensions: [
			{ ...FactoryExtensionDescriptor(), optionsFactory: () => ({ itemCtor: TTabItem }) },
			ActivationExtensionDescriptor(),
			{ ...TabsExtensionDescriptor(), optionsFactory: (instance: ITabs) => ({ owner: instance }) },
		],
	})
```

## Vue wiring

The parent setup uses `TCollectionExtension` to create/bind the collection, then `useVueCollection<TOutput>` for the reactive refs:

```ts
const adapter = createAdapterContext(TabsDescriptor(), { ctrl: toRaw(props.ctrl), props })
	.use(TCollectionExtension, {
		descriptor: TabsCollectionDescriptor(),
		engine: toRaw(props.engine),
		elevator: VueElevatorFactory,
	})

const collectionRefs = useVueCollection<ITabsCollectionOutput>(adapter, props)

return { ...useVue<ITabsComponentProps, ITabs>(adapter, props, emit), ...collectionRefs }
```

`useVueCollection` creates a `TDescriptorInspector` on the collection's accessor, binds output refs, and binds input props reactively (initial values are already applied by `TCollectionPropsExtension`).

## Key files

- `packages/core/src/components/base/collection/` — `TCollection`, extension classes (`extension/`), engine.
- `packages/core/src/components/custom/tabs/collection/types.ts` — `TTabsCollectionExtensions`, `ITabsCollectionOutput`.
- `packages/setup/contributions/components/collection/` — `CollectionContribution` + per-extension contributions.
- `packages/setup/descriptors/components/collection/` — `CollectionDescriptor` + `extensions/*.descriptors.ts`.
- `packages/setup/descriptors/components/tabs/collection.descriptor.ts` — concrete Tabs collection.
- `packages/setup/adapter/extensions/collection/` — `TCollectionExtension`, `TCollectionFactoryExtension`, `TCollectionPropsExtension`.
- `packages/ui/vue/src/adapter/runtime/useVueCollection.ts` — typed collection refs hook.
