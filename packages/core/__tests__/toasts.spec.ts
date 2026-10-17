import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	FRAME_LAYER_ATTRIBUTE,
	TItemContextRegistry,
	TLayer,
	TToasts,
	TToastsCollectionFacade,
	TToastsItem,
	TToastsItemCollectionFacade,
	createEngine,
	createEngineToasts,
	isCloseRequestable,
	isSwipeable,
} from '@soldy-ui/core'
import type { IToastsItem, TToastsItemType, TToastsPlacement } from '@soldy-ui/core'

/**
 * Модель тостов: менеджер-регион, тост и очередь коллекции.
 *
 * Регион — слой (`TLayer`): виден всегда и поднимается в стеке на каждый новый
 * тост. Тост закрывается окончательно, смахивается за всю плашку к стороне
 * своего места и объявляет себя живой областью. Очередь — расширение
 * коллекции `toasts`: вставка в начало, предел видимых вместе с закрытыми,
 * сторона жеста, длительность и событие закрытия. Стопка (`layout:
 * 'cascade'`) своего состояния у тоста не заводит: передний — первый по
 * порядку, глубина — место в составе. Отсчёт, удаление догасших, клавиши,
 * жест и листание стопки ведут плагины, раскладывает и анимирует — тема.
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
	it('умолчания: виден, section, внизу у конца строки, столбцом, три видимых, 5 секунд', () => {
		const owner = new TToasts()

		expect(owner.visible).toBe(true)
		expect(owner.tag).toBe('section')
		expect(owner.target).toBe('body')
		expect(owner.placement).toBe('bottom-end')
		expect(owner.layout).toBe('list')
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

	it('модификатор раскладки — тоже всегда: столбец по умолчанию, смена меняет его', () => {
		const layoutClasses = (owner: TToasts) =>
			owner.classes.toArray().filter((name) => name.includes('--layout-'))
		const owner = new TToasts()

		expect(layoutClasses(owner)).toEqual(['so-toasts--layout-list'])

		owner.layout = 'cascade'

		expect(layoutClasses(owner)).toEqual(['so-toasts--layout-cascade'])
		expect(layoutClasses(new TToasts({ layout: 'cascade' }))).toEqual([
			'so-toasts--layout-cascade',
		])
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
		const onLayout = vi.fn()

		owner.events.on('change:max', onMax)
		owner.events.on('change:duration', onDuration)
		owner.events.on('change:placement', onPlacement)
		owner.events.on('change:layout', onLayout)

		owner.max = 3
		owner.duration = 5000
		owner.placement = 'bottom-end'
		owner.layout = 'list'

		expect(
			[onMax, onDuration, onPlacement, onLayout].map((spy) => spy.mock.calls.length),
		).toEqual([0, 0, 0, 0])

		owner.max = 5
		owner.duration = 0
		owner.placement = 'top'
		owner.layout = 'cascade'

		expect(onMax).toHaveBeenCalledWith(5)
		expect(onDuration).toHaveBeenCalledWith(0)
		expect(onPlacement).toHaveBeenCalledWith('top')
		expect(onLayout).toHaveBeenCalledWith('cascade')
	})
})

describe('тост (TToastsItem)', () => {
	it('умолчания: открыт, li, обычное сообщение, не ждёт, с крестиком, длительность владельца, вежливый', () => {
		const toast = new TToastsItem()

		expect(toast.open).toBe(true)
		expect(toast.tag).toBe('li')
		expect(toast.type).toBeUndefined()
		expect(toast.loading).toBe(false)
		expect(toast.closable).toBe(true)
		expect(toast.duration).toBeUndefined()
		expect(toast.alert).toBe(false)
		expect(toast.render).toBeUndefined()
		expect(toast.classes.toArray()).toContain('so-toasts-item')
	})

	it('ни размера, ни варианта: модификаторов --size-* и --variant-* нет', () => {
		const toast = new TToastsItem({ type: 'error' })

		expect(toast.classes.toArray().filter((name) => /--(size|variant)-/.test(name))).toEqual([])
		expect('size' in toast).toBe(false)
		expect('variant' in toast).toBe(false)
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

	describe('вид сообщения', () => {
		/** Модификаторы вида на тосте. */
		const typeClasses = (toast: TToastsItem) =>
			toast.classes.toArray().filter((name) => name.includes('--type-'))

		it('модификатор --type-* — с конструктора; без вида модификатора нет', () => {
			expect(typeClasses(new TToastsItem())).toEqual([])
			expect(typeClasses(new TToastsItem({ type: 'error' }))).toEqual([
				'so-toasts-item--type-error',
			])
		})

		it('смена вида меняет модификатор, undefined его снимает', () => {
			const toast = new TToastsItem()

			toast.type = 'info'

			expect(typeClasses(toast)).toEqual(['so-toasts-item--type-info'])

			toast.type = 'success'

			expect(typeClasses(toast)).toEqual(['so-toasts-item--type-success'])

			toast.type = undefined

			expect(typeClasses(toast)).toEqual([])
		})

		it.each<[TToastsItemType]>([['info'], ['success'], ['warning'], ['error']])(
			'%s — свой модификатор',
			(type) => {
				expect(typeClasses(new TToastsItem({ type }))).toEqual([
					`so-toasts-item--type-${type}`,
				])
			},
		)

		it('change:type и change:loading — только на смену', () => {
			const toast = new TToastsItem({ type: 'warning' })
			const onType = vi.fn()
			const onLoading = vi.fn()

			toast.events.on('change:type', onType)
			toast.events.on('change:loading', onLoading)

			toast.type = 'warning'
			toast.loading = false

			expect([onType.mock.calls.length, onLoading.mock.calls.length]).toEqual([0, 0])

			toast.type = 'success'
			toast.loading = true
			toast.type = undefined
			toast.loading = false

			expect(onType.mock.calls).toEqual([['success'], [undefined]])
			expect(onLoading.mock.calls).toEqual([[true], [false]])
		})

		it('getProps — вид и ожидание', () => {
			const props = new TToastsItem({ type: 'info', loading: true }).getProps()

			expect(props.type).toBe('info')
			expect(props.loading).toBe(true)
		})
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

	it('show доносит вид и ожидание: модификатор вида — с первой записи', () => {
		const { engine } = engineOf()
		const { show } = engine.extensions.toasts

		const saving = show({ text: 'Сохраняем…', loading: true })
		const failed = show({ text: 'Нет сети', type: 'error', alert: true })

		expect(saving?.loading).toBe(true)
		expect(saving?.type).toBeUndefined()
		expect(failed?.type).toBe('error')
		expect(failed?.loading).toBe(false)
		expect(failed?.classes.toArray()).toContain('so-toasts-item--type-error')
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

	it('пока тост ждёт, durationOf — 0 при любой своей и владельца; снятое ожидание возвращает итог', () => {
		const { engine } = engineOf(new TToasts({ duration: 3000 }))
		const { toasts } = engine.extensions
		const inherited = new TToastsItem({ loading: true })
		const own = new TToastsItem({ loading: true, duration: 1000 })

		expect(toasts.durationOf(inherited)).toBe(0)
		expect(toasts.durationOf(own)).toBe(0)

		inherited.loading = false
		own.loading = false

		expect(toasts.durationOf(inherited)).toBe(3000)
		expect(toasts.durationOf(own)).toBe(1000)
	})

	it('item:duration — на ожидание и на его снятие', () => {
		const { engine } = engineOf()
		const toast = engine.extensions.toasts.show({ text: 'Сохраняем…', loading: true })
		const onDuration = vi.fn()

		engine.extensions.toasts.events.on('item:duration', onDuration)

		if (toast) toast.loading = false

		expect(onDuration.mock.calls).toEqual([[toast]])

		onDuration.mockClear()

		if (toast) toast.loading = true

		expect(onDuration.mock.calls).toEqual([[toast]])
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

/**
 * Стопка своего состояния у тоста не заводит: передний — первый по порядку
 * коллекции, глубина — место тоста в составе (`order` фасада, его разметка
 * отдаёт теме переменной `--so-toasts-depth`), а вывести задний вперёд —
 * перестановка. Экран и скринридер видят один порядок.
 */
describe('стопка: передний — первый по порядку, глубина — место в составе', () => {
	function stackOf(...texts: string[]) {
		const { engine } = engineOf(new TToasts({ layout: 'cascade' }))
		const toasts = texts.map((text) => {
			const toast = engine.extensions.toasts.show(text)

			if (!toast) throw new Error('тост не показан')

			return toast
		})
		const registry = new TItemContextRegistry(engine.getCore())

		/** Фасад тоста с контекстом — так его держит разметка тоста. */
		const facadeOf = (toast: IToastsItem) => {
			const facade = new TToastsItemCollectionFacade()

			facade.setContext(registry.get(toast))

			return facade
		}

		return { engine, toasts, facadeOf }
	}

	it('новый тост — передний: глубина 0, у прежних — на шаг больше', () => {
		const { toasts, facadeOf } = stackOf('Первый', 'Второй', 'Третий')

		expect(toasts.map((toast) => facadeOf(toast).order)).toEqual([2, 1, 0])
	})

	it('вывести задний вперёд — перестановка: новый порядок и глубина, change:order', () => {
		const { engine, toasts, facadeOf } = stackOf('Первый', 'Второй', 'Третий')
		const [oldest] = toasts

		if (!oldest) throw new Error('тостов нет')

		const facades = toasts.map(facadeOf)
		const changed = facades.map((facade) => {
			const handler = vi.fn()

			facade.events.on('change:order', handler)

			return handler
		})

		engine.extensions.plain.move(oldest, 0)

		expect(textsOf(engine.extensions.batch.shown)).toEqual(['Первый', 'Третий', 'Второй'])
		expect(facades.map((facade) => facade.order)).toEqual([0, 2, 1])
		expect(changed.map((handler) => handler.mock.calls.length)).toEqual([1, 1, 1])
		// Перестановка — не закрытие и не смена стороны: тост тот же
		expect(oldest.open).toBe(true)
	})
})
