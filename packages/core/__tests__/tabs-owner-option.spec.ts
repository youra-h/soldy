import { describe, it, expect } from 'vitest'
import { createEngine, TTabs, TTabsCollectionFacade, TTabsItem } from '@soldy-ui/core'

/**
 * Владелец — опция движка: движок переживает владельца (модалка с
 * `<Tabs :engine>`), и новый владелец занимает место прежнего.
 */
describe('владелец Tabs — опция движка', () => {
	function tabsOf(items: readonly unknown[]): TTabsItem[] {
		return items.filter((item) => item instanceof TTabsItem)
	}

	it('модалка: владелец A → снятие → владелец B', () => {
		const engine = createEngine({ items: [{ value: 'a' }, { value: 'b' }] })

		const a = new TTabs({ size: 'lg', closable: true })
		const facadeA = new TTabsCollectionFacade({}, { owner: a, engine })

		facadeA.bindOwner()

		expect(tabsOf(engine.extensions.batch.items).map((tab) => tab.size)).toEqual(['lg', 'lg'])
		expect(facadeA.closable).toBe(true)

		// Модалку закрыли: владелец снят, подписки на него — тоже
		facadeA.releaseOwner()

		expect(engine.options.get('owner')).toBeUndefined()

		a.size = 'sm'
		a.disabled = true

		expect(tabsOf(engine.extensions.batch.items).map((tab) => tab.size)).toEqual(['lg', 'lg'])
		expect(tabsOf(engine.extensions.batch.items).some((tab) => tab.disabled)).toBe(false)

		// Открыли снова: тот же движок, новый владелец
		const b = new TTabs({ size: 'xl', closable: false })
		const facadeB = new TTabsCollectionFacade({}, { owner: b, engine })

		facadeB.bindOwner()

		expect(tabsOf(engine.extensions.batch.items).map((tab) => tab.size)).toEqual(['xl', 'xl'])
		expect(facadeB.closable).toBe(false)

		b.disabled = true

		expect(tabsOf(engine.extensions.batch.items).every((tab) => tab.disabled)).toBe(true)
	})

	it('два живых владельца на одном движке — ошибка', () => {
		const engine = createEngine()

		new TTabsCollectionFacade({}, { owner: new TTabs(), engine }).bindOwner()

		const second = new TTabsCollectionFacade({}, { owner: new TTabs(), engine })

		expect(() => second.bindOwner()).toThrow(/движок уже принадлежит/)
	})

	it('тот же владелец привязывается повторно без ошибки', () => {
		const engine = createEngine()
		const owner = new TTabs()
		const facade = new TTabsCollectionFacade({}, { owner, engine })

		facade.bindOwner()

		expect(() => facade.bindOwner()).not.toThrow()
	})
})
