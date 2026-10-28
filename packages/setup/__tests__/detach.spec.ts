// @vitest-environment jsdom

/**
 * The context's `detach` — the first moment of the teardown — and its way to
 * a collection's members.
 *
 * The context reports the phase and does nothing on it: once, before
 * `destroy`, and `destroy` detaches first when the runtime did not. A
 * framework that removes a subtree in one pass (Svelte, Solid, Angular)
 * destroys the items one by one, and an item still heard would hear its
 * siblings go: the owner's `detach` detaches every member of its collection —
 * an item's own context and its facade's, a Tabs panel's as well — before any
 * of them is destroyed (`TCollectionMembers`). An item leaving alone detaches
 * only itself, and a destroyed item is no member any more.
 */

import { describe, it, expect } from 'vitest'
import {
	TabsCollectionContentDescriptor,
	TabsCollectionDescriptor,
	TabsCollectionItemDescriptor,
	TabsContentDescriptor,
	TabsDescriptor,
	TabsItemDescriptor,
} from '../content/descriptors'
import {
	TCollectionExtension,
	TCollectionItemExtension,
	TTabsContentBindingExtension,
} from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext, TElevatorFactory } from '../protected/adapter'
import { createElevatorFactory } from './helpers'

/** The phases a context reported, in order. */
function phases(context: IAdapterContext): string[] {
	const seen: string[] = []

	context.events.on('attach', () => seen.push('attach'))
	context.events.on('detach', () => seen.push('detach'))
	context.events.on('destroy', () => seen.push('destroy'))

	return seen
}

/** Tabs as the adapters assemble them: its own context and the collection facade's. */
function mountTabs(elevator: TElevatorFactory): IAdapterContext {
	const owner = createAdapterContext(TabsDescriptor(), {})
	const facade = createAdapterContext(
		TabsCollectionDescriptor(),
		{ options: { owner: owner.instance } },
		{ bundle: owner.bundle },
	).use(TCollectionExtension, { elevator })

	owner.attach()
	facade.attach()

	return facade
}

/** A tab from markup: its own context and the facade's, accepted. */
function mountTab(elevator: TElevatorFactory, value: string): IAdapterContext[] {
	const own = createAdapterContext(TabsItemDescriptor(), { props: { value, text: value } })
	const facade = createAdapterContext(
		TabsCollectionItemDescriptor(),
		{ props: { value } },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator })

	own.attach()
	facade.attach()

	return [own, facade]
}

/** A panel of Tabs: its own context and the facade's, accepted. */
function mountPanel(elevator: TElevatorFactory, value: string): IAdapterContext[] {
	const own = createAdapterContext(TabsContentDescriptor(), { props: { value } })
	const facade = createAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props: { value } },
		{ bundle: own.bundle },
	).use(TTabsContentBindingExtension, { adapter: own, elevator })

	own.attach()
	facade.attach()

	return [own, facade]
}

describe('detach — первый миг снятия', () => {
	it('приходит один раз, раньше destroy', () => {
		const context = createAdapterContext(TabsItemDescriptor(), {})
		const seen = phases(context)

		context.attach()
		context.detach()
		context.detach()
		context.destroy()

		expect(seen).toEqual(['attach', 'detach', 'destroy'])
	})

	it('destroy без detach сначала отсоединяет', () => {
		const context = createAdapterContext(TabsItemDescriptor(), {})
		const seen = phases(context)

		context.attach()
		context.destroy()

		expect(seen).toEqual(['attach', 'detach', 'destroy'])
	})
})

describe('detach коллекции доходит до её участников', () => {
	it('элементы и панели отсоединяются вместе с владельцем, раньше любого уничтожения', () => {
		const { factory } = createElevatorFactory()
		const owner = mountTabs(factory)
		const members = [
			...mountTab(factory, 'a'),
			...mountTab(factory, 'b'),
			...mountPanel(factory, 'a'),
		]
		const seen = members.map(phases)

		owner.detach()

		expect(seen).toEqual(members.map(() => ['detach']))
	})

	it('элемент, снятый один, отсоединяет только себя', () => {
		const { factory } = createElevatorFactory()

		mountTabs(factory)

		const first = mountTab(factory, 'a')
		const second = mountTab(factory, 'b')
		const seen = second.map(phases)

		for (const context of first) context.detach()

		expect(seen).toEqual([[], []])
	})

	it('уничтоженный элемент больше не участник', () => {
		const { factory } = createElevatorFactory()
		const owner = mountTabs(factory)
		const item = mountTab(factory, 'a')

		for (const context of item) context.destroy()

		const seen = item.map(phases)

		owner.detach()

		expect(seen).toEqual([[], []])
	})
})
