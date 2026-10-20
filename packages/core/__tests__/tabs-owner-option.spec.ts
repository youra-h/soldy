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

	/**
	 * Без `ctrl` у каждого монтирования свой владелец, и новое бывает принято
	 * раньше, чем снято прежнее. Привязку держит последний принятый: другой
	 * владелец на занятом движке — не ошибка, а смена держателя.
	 */
	it('новый владелец вытесняет прежнего: свойства прежнего до табов не доходят, снятие прежнего привязку не трогает', () => {
		const engine = createEngine({ items: [{ value: 'a' }, { value: 'b' }] })
		const previous = new TTabs({ size: 'lg' })
		const next = new TTabs({ size: 'xl' })
		const first = new TTabsCollectionFacade({}, { owner: previous, engine })
		const second = new TTabsCollectionFacade({}, { owner: next, engine })
		const sizes = () => tabsOf(engine.extensions.batch.items).map((tab) => tab.size)

		first.bindOwner()

		expect(() => second.bindOwner()).not.toThrow()
		expect(engine.options.get('owner')).toBe(next)
		expect(sizes()).toEqual(['xl', 'xl'])

		// Подписки на прежнего сняты
		previous.size = 'sm'

		expect(sizes()).toEqual(['xl', 'xl'])

		// Снятие прежнего привязку нового не трогает
		first.releaseOwner()

		expect(engine.options.get('owner')).toBe(next)

		next.size = '2xl'

		expect(sizes()).toEqual(['2xl', '2xl'])

		second.releaseOwner()

		expect(engine.options.get('owner')).toBeUndefined()
	})

	/**
	 * Новое монтирование снято раньше прежнего, а прежнее живо — Svelte, прервав
	 * уход ветки, возобновляет её без нового приёма. Привязка возвращается к
	 * предыдущему живому держателю.
	 */
	it('снят новый владелец — привязка возвращается к прежнему', () => {
		const engine = createEngine({ items: [{ value: 'a' }, { value: 'b' }] })
		const previous = new TTabs({ size: 'lg' })
		const next = new TTabs({ size: 'xl' })
		const first = new TTabsCollectionFacade({}, { owner: previous, engine })
		const second = new TTabsCollectionFacade({}, { owner: next, engine })
		const sizes = () => tabsOf(engine.extensions.batch.items).map((tab) => tab.size)

		first.bindOwner()
		second.bindOwner()
		second.releaseOwner()

		expect(engine.options.get('owner')).toBe(previous)
		expect(sizes()).toEqual(['lg', 'lg'])

		// Подписки на нового сняты, на прежнего — снова живы
		next.size = '2xl'

		expect(sizes()).toEqual(['lg', 'lg'])

		previous.size = 'sm'

		expect(sizes()).toEqual(['sm', 'sm'])

		first.releaseOwner()

		expect(engine.options.get('owner')).toBeUndefined()

		previous.size = 'xl'

		expect(sizes()).toEqual(['sm', 'sm'])
	})

	it('владельца, записанного в опции мимо фасадов, снятие держателя не трогает', () => {
		const engine = createEngine()
		const bound = new TTabs()
		const written = new TTabs()
		const facade = new TTabsCollectionFacade({}, { owner: bound, engine })

		facade.bindOwner()
		engine.options.set({ owner: written })
		facade.releaseOwner()

		expect(engine.options.get('owner')).toBe(written)
	})

	it('тот же владелец привязывается повторно без ошибки', () => {
		const engine = createEngine()
		const owner = new TTabs()
		const facade = new TTabsCollectionFacade({}, { owner, engine })

		facade.bindOwner()

		expect(() => facade.bindOwner()).not.toThrow()
	})

	/**
	 * Новый компонент над тем же владельцем и движком бывает принят раньше, чем
	 * снят прежний. Привязку снимает только её держатель — фасад, который
	 * привязал владельца последним.
	 */
	it('второй фасад того же владельца привязал раньше, чем снят первый: снятие первого привязку не трогает', () => {
		const engine = createEngine({ items: [{ value: 'a' }, { value: 'b' }] })
		const owner = new TTabs({ size: 'lg' })
		const first = new TTabsCollectionFacade({}, { owner, engine })
		const second = new TTabsCollectionFacade({}, { owner, engine })
		const sizes = () => tabsOf(engine.extensions.batch.items).map((tab) => tab.size)

		first.bindOwner()
		second.bindOwner()
		first.releaseOwner()

		expect(engine.options.get('owner')).toBe(owner)

		// Подписки на владельца живы: размер доходит до табов
		owner.size = 'sm'

		expect(sizes()).toEqual(['sm', 'sm'])

		second.releaseOwner()

		expect(engine.options.get('owner')).toBeUndefined()

		owner.size = 'xl'

		expect(sizes()).toEqual(['sm', 'sm'])
	})

	it('фасад, который не привязывал, при снятии владельца не трогает', () => {
		const engine = createEngine()
		const owner = new TTabs()
		const bound = new TTabsCollectionFacade({}, { owner, engine })
		// Сборка над тем же владельцем, уничтоженная без приёма
		const discarded = new TTabsCollectionFacade({}, { owner, engine })

		bound.bindOwner()
		discarded.releaseOwner()

		expect(engine.options.get('owner')).toBe(owner)

		bound.releaseOwner()

		expect(engine.options.get('owner')).toBeUndefined()
	})
})
