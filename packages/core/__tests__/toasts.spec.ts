import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	FRAME_LAYER_ATTRIBUTE,
	TLayer,
	TToasts,
	TToastsCollectionFacade,
	TToastsItem,
	createEngine,
	createEngineToasts,
	isCloseRequestable,
	isSwipeable,
} from '@soldy-ui/core'
import type { IToastsItem, TToastsPlacement } from '@soldy-ui/core'

/**
 * Модель тостов: менеджер-регион, тост и очередь коллекции.
 *
 * Регион — слой (`TLayer`): виден всегда и поднимается в стеке на каждый новый
 * тост. Тост закрывается окончательно, смахивается за всю плашку к стороне
 * своего места и объявляет себя живой областью. Очередь — расширение
 * коллекции `toasts`: вставка в начало, предел видимых вместе с закрытыми,
 * сторона жеста, длительность и событие закрытия. Отсчёт, удаление догасших,
 * клавиши и жест ведут плагины, раскладывает и анимирует — тема.
 */

beforeEach(() => {
	TLayer.resetZIndexCounter()
})

/** Движок с владельцем — так его собирает `<Toasts>`. */
function engineOf(owner = new TToasts()) {
	return { owner, engine: createEngineToasts({ owner }) }
}

const textsOf = (toasts: ReadonlyArray<IToastsItem>) => toasts.map((toast) => toast.text)

describe('регион (TToasts)', () => {
	it('умолчания: виден, section, внизу у конца строки, три видимых, 5 секунд', () => {
		const owner = new TToasts()

		expect(owner.visible).toBe(true)
		expect(owner.tag).toBe('section')
		expect(owner.target).toBe('body')
		expect(owner.placement).toBe('bottom-end')
		expect(owner.max).toBe(3)
		expect(owner.duration).toBe(5000)
	})

	it('регион — живая область с первой сборки, ещё без тостов', () => {
		const owner = new TToasts()

		expect(owner.aria.get('role')).toBe('region')
		expect(owner.aria.get('aria-live')).toBe('polite')
	})

	it('класс so-toasts и модификатор места — с первой записи, смена меняет его', () => {
		const owner = new TToasts({ placement: 'top-start' })

		expect(owner.classes.toArray()).toEqual(
			expect.arrayContaining(['so-toasts', 'so-toasts--placement-top-start']),
		)

		owner.placement = 'bottom'

		expect(owner.classes.toArray()).toContain('so-toasts--placement-bottom')
		expect(owner.classes.toArray()).not.toContain('so-toasts--placement-top-start')
	})

	it('виден с конструктора — значит, у него уже есть номер слоя', () => {
		const owner = new TToasts()

		expect(owner.zIndex).toBeGreaterThan(0)
		expect(owner.dataset.get(FRAME_LAYER_ATTRIBUTE)).toBe(String(owner.zIndex))
	})

	it('raise() — номер выше всех выданных, событие change:zIndex', () => {
		const owner = new TToasts()
		const dialog = new TLayer({ visible: true })
		const onZIndex = vi.fn()

		owner.events.on('change:zIndex', onZIndex)
		owner.raise()

		expect(owner.zIndex).toBeGreaterThan(dialog.zIndex)
		expect(onZIndex).toHaveBeenCalledWith(owner.zIndex)
	})

	it('смена пропсов шлёт событие только на смену', () => {
		const owner = new TToasts()
		const onMax = vi.fn()
		const onDuration = vi.fn()
		const onPlacement = vi.fn()

		owner.events.on('change:max', onMax)
		owner.events.on('change:duration', onDuration)
		owner.events.on('change:placement', onPlacement)

		owner.max = 3
		owner.duration = 5000
		owner.placement = 'bottom-end'

		expect([onMax, onDuration, onPlacement].map((spy) => spy.mock.calls.length)).toEqual([
			0, 0, 0,
		])

		owner.max = 5
		owner.duration = 0
		owner.placement = 'top'

		expect(onMax).toHaveBeenCalledWith(5)
		expect(onDuration).toHaveBeenCalledWith(0)
		expect(onPlacement).toHaveBeenCalledWith('top')
	})
})

describe('тост (TToastsItem)', () => {
	it('умолчания: открыт, li, с крестиком, длительность владельца, вежливый', () => {
		const toast = new TToastsItem()

		expect(toast.open).toBe(true)
		expect(toast.tag).toBe('li')
		expect(toast.closable).toBe(true)
		expect(toast.duration).toBeUndefined()
		expect(toast.alert).toBe(false)
		expect(toast.render).toBeUndefined()
		expect(toast.classes.toArray()).toContain('so-toasts-item')
	})

	it('роль status, у срочного — alert; смена alert меняет роль', () => {
		const toast = new TToastsItem({ text: 'Сохранено' })

		expect(toast.aria.get('role')).toBe('status')

		toast.alert = true

		expect(toast.aria.get('role')).toBe('alert')
		expect(new TToastsItem({ alert: true }).aria.get('role')).toBe('alert')
	})

	it('фокусируемый: tabindex 0, у закрытого — -1', () => {
		const toast = new TToastsItem()

		expect(toast.aria.get('tabindex')).toBe('0')

		toast.close()

		expect(toast.aria.get('tabindex')).toBe('-1')
	})

	it('data-open и data-swiping — с первой отрисовки', () => {
		const toast = new TToastsItem()

		expect(toast.dataset.get('open')).toBe('true')
		expect(toast.dataset.get('swiping')).toBe('false')
	})

	it('вариант — модификатор --variant-*, без варианта модификатора нет', () => {
		expect(
			new TToastsItem().classes.toArray().some((name) => name.includes('--variant-')),
		).toBe(false)
		expect(new TToastsItem({ variant: 'brand' }).classes.toArray()).toContain(
			'so-toasts-item--variant-brand',
		)
	})

	describe('закрытие окончательное', () => {
		it('close() — open false, data-open false, change:open один раз', () => {
			const toast = new TToastsItem()
			const onOpen = vi.fn()

			toast.events.on('change:open', onOpen)
			toast.close()
			toast.close()

			expect(toast.open).toBe(false)
			expect(toast.dataset.get('open')).toBe('false')
			expect(onOpen).toHaveBeenCalledTimes(1)
			expect(onOpen).toHaveBeenCalledWith(false)
		})

		it('open только для чтения: записи нет', () => {
			const toast = new TToastsItem()
			const descriptor = Object.getOwnPropertyDescriptor(TToastsItem.prototype, 'open')

			expect(descriptor?.set).toBeUndefined()
			expect(toast.open).toBe(true)
		})

		it('запрос закрытия принимается всегда — с любой причиной', () => {
			const toast = new TToastsItem()

			expect(isCloseRequestable(toast)).toBe(true)

			toast.requestClose('swipe')

			expect(toast.open).toBe(false)
		})
	})

	describe('жест', () => {
		it('смахиваемый: за всю плашку, сторона — конец строки, пока её не написала коллекция', () => {
			const toast = new TToastsItem()

			expect(isSwipeable(toast)).toBe(true)
			expect(toast.swipe).toBe('panel')
			expect(toast.swipeSide).toBe('end')
		})

		it('beginSwipe — признак «тянут» и data-swiping, endSwipe снимает', () => {
			const toast = new TToastsItem()
			const onSwiping = vi.fn()

			toast.events.on('change:swiping', onSwiping)

			expect(toast.beginSwipe()).toBe(true)
			expect(toast.swiping).toBe(true)
			expect(toast.dataset.get('swiping')).toBe('true')

			toast.endSwipe()

			expect(toast.swiping).toBe(false)
			expect(onSwiping.mock.calls).toEqual([[true], [false]])
		})

		it('закрытый тост не тянут, а закрытие посреди жеста его снимает', () => {
			const toast = new TToastsItem()

			toast.beginSwipe()
			toast.close()

			expect(toast.swiping).toBe(false)
			expect(toast.beginSwipe()).toBe(false)
		})
	})

	describe('свойства', () => {
		it('text и closable — через change:<x>:before: правка и отмена', () => {
			const toast = new TToastsItem({ text: 'Было' })

			toast.events.on('change:text:before', (e) => {
				e.value = e.value.toUpperCase()
			})
			toast.text = 'стало'

			expect(toast.text).toBe('СТАЛО')

			toast.events.on('change:closable:before', (e) => e.preventDefault())
			toast.closable = false

			expect(toast.closable).toBe(true)
		})

		it('render ядро не читает — хранит как есть', () => {
			const render = { name: 'Undo' }
			const toast = new TToastsItem({ render })

			expect(toast.render).toBe(render)
		})
	})
})

describe('очередь (расширение toasts)', () => {
	it('show — текстом или опциями: новый тост первым, возвращается тост', () => {
		const { engine } = engineOf()
		const { show } = engine.extensions.toasts

		const saved = show('Сохранено')
		const sent = show({ text: 'Отправлено', description: 'Письмо ушло', alert: true })

		expect(saved).toBeInstanceOf(TToastsItem)
		expect(sent?.description).toBe('Письмо ушло')
		expect(sent?.alert).toBe(true)
		expect(textsOf(engine.extensions.batch.items)).toEqual(['Отправлено', 'Сохранено'])
	})

	it('show без this — поле со стрелкой, деструктуризация работает', () => {
		const { engine } = engineOf()
		const { show } = engine.extensions.toasts

		expect(show('Без this')?.text).toBe('Без this')
	})

	it('отменённая вставка — undefined', () => {
		const { engine } = engineOf()

		engine.extensions.plain.events.on('item:add:before', (e) => e.preventDefault())

		expect(engine.extensions.toasts.show('Отменён')).toBeUndefined()
		expect(engine.extensions.batch.items).toEqual([])
	})

	it('видно не больше max; закрытый место держит, пока он в коллекции', () => {
		const { owner, engine } = engineOf(new TToasts({ max: 2 }))
		const { show } = engine.extensions.toasts

		show('Первый')

		const second = show('Второй')

		show('Третий')

		expect(textsOf(engine.extensions.batch.shown)).toEqual(['Третий', 'Второй'])

		// Закрытый «Второй» гаснет, но в коллекции — место держит
		second?.close()

		expect(textsOf(engine.extensions.batch.shown)).toEqual(['Третий', 'Второй'])

		// Ушёл из коллекции — ждавший «Первый» возвращается
		if (second) engine.extensions.plain.remove(second)

		expect(textsOf(engine.extensions.batch.shown)).toEqual(['Третий', 'Первый'])

		owner.max = 1

		expect(textsOf(engine.extensions.batch.shown)).toEqual(['Третий'])
	})

	it('смена max — change:shown', () => {
		const { owner, engine } = engineOf()
		const onShown = vi.fn()

		engine.extensions.batch.events.on('change:shown', onShown)
		owner.max = 1

		expect(onShown).toHaveBeenCalledTimes(1)
	})

	it('без владельца предела нет: показывать некому', () => {
		const engine = createEngineToasts()

		for (const text of ['1', '2', '3', '4']) engine.extensions.toasts.show(text)

		expect(engine.extensions.batch.shown).toHaveLength(4)
	})

	it.each<[TToastsPlacement, string]>([
		['top-start', 'start'],
		['bottom-start', 'start'],
		['top-end', 'end'],
		['bottom-end', 'end'],
		['top', 'top'],
		['bottom', 'bottom'],
	])('место %s — тост смахивают к стороне %s', (placement, side) => {
		const { engine } = engineOf(new TToasts({ placement }))

		expect(engine.extensions.toasts.show('Тост')?.swipeSide).toBe(side)
	})

	it('смена места — новая сторона всем тостам', () => {
		const { owner, engine } = engineOf()
		const toast = engine.extensions.toasts.show('Тост')

		owner.placement = 'top-start'

		expect(toast?.swipeSide).toBe('start')
	})

	it('каждый новый тост поднимает регион над слоями', () => {
		const { owner, engine } = engineOf()
		const dialog = new TLayer({ visible: true })

		expect(owner.zIndex).toBeLessThan(dialog.zIndex)

		engine.extensions.toasts.show('Поверх окна')

		expect(owner.zIndex).toBeGreaterThan(dialog.zIndex)
	})

	it('durationOf — своя длительность, иначе владельца; без владельца — 0', () => {
		const { owner, engine } = engineOf(new TToasts({ duration: 3000 }))
		const { toasts } = engine.extensions

		expect(toasts.durationOf(new TToastsItem())).toBe(3000)
		expect(toasts.durationOf(new TToastsItem({ duration: 0 }))).toBe(0)
		expect(toasts.durationOf(new TToastsItem({ duration: 1000 }))).toBe(1000)

		owner.duration = 7000

		expect(toasts.durationOf(new TToastsItem())).toBe(7000)
		expect(createEngineToasts().extensions.toasts.durationOf(new TToastsItem())).toBe(0)
	})

	it('item:duration — на свою длительность и на длительность владельца у тостов без своей', () => {
		const { owner, engine } = engineOf()
		const { show } = engine.extensions.toasts
		const own = show({ text: 'Своя', duration: 1000 })
		const inherited = show('Владельца')
		const onDuration = vi.fn()

		engine.extensions.toasts.events.on('item:duration', onDuration)

		owner.duration = 9000

		expect(onDuration.mock.calls).toEqual([[inherited]])

		onDuration.mockClear()

		if (own) own.duration = 2000

		expect(onDuration.mock.calls).toEqual([[own]])
	})

	it('item:close — один раз на тост, и только пока тост в коллекции', () => {
		const { engine } = engineOf()
		const onClose = vi.fn()
		const toast = engine.extensions.toasts.show('Тост')

		engine.extensions.toasts.events.on('item:close', onClose)

		toast?.close()
		toast?.close()

		expect(onClose.mock.calls).toEqual([[toast]])

		const removed = engine.extensions.toasts.show('Удалённый')

		if (removed) engine.extensions.plain.remove(removed)

		onClose.mockClear()
		removed?.close()

		expect(onClose).not.toHaveBeenCalled()
	})

	it('item:close доходит до фасада пробросом', () => {
		const owner = new TToasts()
		const facade = new TToastsCollectionFacade({}, { owner })
		const onClose = vi.fn()

		facade.events.on('item:close', onClose)

		const toast = facade.engine.extensions.toasts.show('Тост')

		toast?.close()

		expect(onClose).toHaveBeenCalledWith(toast)
	})

	it('движок уровня 1, отданный фасаду, получает очередь', () => {
		const engine = createEngine<IToastsItem>({ items: [{ text: 'Из данных' }] })
		const facade = new TToastsCollectionFacade({}, { engine, owner: new TToasts() })

		facade.bindOwner()

		expect(facade.engine.extensions.batch.items[0]).toBeInstanceOf(TToastsItem)
		expect(facade.engine.extensions.toasts.show('Новый')?.text).toBe('Новый')
		expect(textsOf(facade.shown)).toEqual(['Новый', 'Из данных'])
	})
})
