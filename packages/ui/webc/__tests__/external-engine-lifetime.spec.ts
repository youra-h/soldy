/**
 * Подключения над движком и владельцем снаружи ничего не оставляют на их шинах.
 *
 * Движок и `ctrl`, переданные снаружи, живут дольше подключения. Фасад
 * коллекции подписывается на расширения движка пробросом (`relayAll`), а
 * проброс держит источник, только пока цель слушают (`TEvented`): фасад уходит
 * с движка вместе со своими подписчиками — обменом адаптера. У Web Components
 * связка новая на каждое подключение: элемент, переставленный в документе,
 * собирается заново, и прежняя сборка обязана уйти с движка целиком. Здесь —
 * настоящий цикл Web Components, как `ui/angular/__tests__/external-engine-lifetime.spec.ts`
 * у Angular: набор табов, список, набор тегов, Select, пагинация и таблица,
 * переставленные трижды и снятые, и на шинах владельца, движка и его
 * расширений ни подписки, ни перехватчика, ни слушателя обмена. У таблицы —
 * ещё строки, колонки и «выбрать все»: их держат элементы частей и чекбоксы, а
 * в окне `<so-virtual>` — и выключатель обёртки. У меню и Select опции — в
 * панели, увезённой в `body`: она идёт за местом владельца и пересобирается
 * вместе с ним, а снятый владелец уводит её сразу. У Select ещё поле — деталь
 * Input над экземпляром поля владельца, — а в `multiple` и теги в поле над
 * экземпляром и коллекцией, которые держит его движок.
 *
 * Список над движком без `ctrl`, подключённый раньше, чем снят прежний, берёт
 * привязку владельца себе, хотя прежний ещё держит движок.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import {
	TEvented,
	TListBox,
	TMenu,
	TPagination,
	TSelect,
	TTable,
	TTabs,
	TTags,
	TVirtual,
	createEngineListBox,
	createEngineMenu,
	createEnginePagination,
	createEngineSelect,
	createEngineTable,
	createEngineTabs,
	createEngineTags,
	type TListBoxCollection,
	type TTableCollection,
} from '@soldy-ui/core'
import {
	TListBoxElement,
	TMenuElement,
	TPaginationElement,
	TSelectElement,
	TTableElement,
	TTabsElement,
	TTagsElement,
	TVirtualElement,
	type TListBoxElementProps,
	type TMenuElementProps,
	type TPaginationElementProps,
	type TSelectElementProps,
	type TTableElementProps,
	type TTabsElementProps,
	type TTagsElementProps,
	type TVirtualElementProps,
} from '@soldy-ui/webc'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

function isTabs(node: Element): node is TTabsElementProps {
	return node instanceof TTabsElement
}

function isListBox(node: Element): node is TListBoxElementProps {
	return node instanceof TListBoxElement
}

function isMenu(node: Element): node is TMenuElementProps {
	return node instanceof TMenuElement
}

function isTags(node: Element): node is TTagsElementProps {
	return node instanceof TTagsElement
}

function isSelect(node: Element): node is TSelectElementProps {
	return node instanceof TSelectElement
}

function isPagination(node: Element): node is TPaginationElementProps {
	return node instanceof TPaginationElement
}

function isTable(node: Element): node is TTableElementProps {
	return node instanceof TTableElement
}

function isVirtual(node: Element): node is TVirtualElementProps {
	return node instanceof TVirtualElement
}

/**
 * Движок строк таблицы снаружи: две строки из данных, колонка с заголовком
 * строки, сортировкой и ручкой и выбор нескольких — так таблица рисует и
 * кнопку сортировки, и ручку, и колонку выбора.
 */
function tableEngine(owner?: TTable): TTableCollection {
	const engine = createEngineTable({
		owner,
		items: ITEMS.map((data, index) => ({ data: { id: index + 1, ...data } })),
	})

	engine.extensions.columns.columns = [
		{
			field: 'text',
			text: 'Текст',
			rowHeader: true,
			sortable: true,
			resizable: true,
			width: 150,
		},
	]
	engine.extensions.selection.mode = 'multiple'

	return engine
}

/** Шины движка таблицы: сам движок, расширения, строки, колонки и «выбрать все». */
function tableBuses(engine: TTableCollection): TEvented<any>[] {
	return [
		engine.events,
		...Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		),
		...engine.extensions.batch.items.map((row) => row.events),
		...engine.extensions.columns.columns.map((column) => column.events),
		engine.extensions.table.selectAll.events,
	]
}

/** Таблица над движком снаружи, ещё не подключённая. */
function createTable(engine: TTableCollection, owner?: TTable): TTableElementProps {
	const el = document.createElement('div', { is: 'so-table' })

	if (!isTable(el)) throw new Error('<div is="so-table"> нет')

	if (owner) el.ctrl = owner

	el.engine = engine

	return el
}

/**
 * Живые подписки шин: `on` без парного `off`, перехватчики `use` и слушатели
 * `listen`, которых не сняли.
 */
function watchBuses(buses: readonly TEvented<any>[]): () => string[] {
	const live = new Map<string, number>()
	const keys = new Map<unknown, Map<string, string>>()
	let next = 0
	const keyOf = (handler: unknown, event: string): string => {
		const byEvent = keys.get(handler) ?? new Map<string, string>()
		const key = byEvent.get(event) ?? `${event}#${next++}`

		byEvent.set(event, key)
		keys.set(handler, byEvent)

		return key
	}
	const count = (key: string, delta: number) => {
		const value = (live.get(key) ?? 0) + delta

		if (value > 0) live.set(key, value)
		else live.delete(key)
	}

	for (const bus of buses) {
		const on = bus.on.bind(bus)
		const off = bus.off.bind(bus)
		const use = bus.use.bind(bus)
		const listen = bus.listen.bind(bus)

		vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
			count(keyOf(handler, String(event)), 1)
			on(event, handler)
		})
		vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
			count(keyOf(handler, String(event)), -1)
			off(event, handler)
		})
		vi.spyOn(bus, 'use').mockImplementation((middleware) => {
			const key = `use#${next++}`
			const release = use(middleware)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
		vi.spyOn(bus, 'listen').mockImplementation((listener) => {
			const key = `listen#${next++}`
			const release = listen(listener)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
	}

	return () => [...live.keys()].map((key) => key.replace(/#\d+$/, ''))
}

/**
 * Набор над движком и владельцем снаружи — переставленный трижды одной
 * операцией и снятый. После каждой перестановки он собран по-настоящему
 * (элементы на месте) и одной сборкой — прежние ушли, а после снятия на шинах
 * ничего, без ожидания. Элементы ищутся в самом наборе, а у меню — в документе:
 * его пункты в панели, увезённой в `body`.
 */
async function moveThriceAndRemove(
	el: HTMLElement,
	live: () => string[],
	item: string,
	scope: ParentNode = el,
): Promise<void> {
	document.body.appendChild(el)
	await flush()

	// Подписки одной сборки — после первой перестановки: подписки движка на
	// владельца, заведённые до слежки (сборщиком движка с `owner`), снимает
	// снятие прежней сборки, а новая заводит их заново
	let mounted: string[] | undefined

	for (let i = 0; i < 3; i++) {
		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		mounted ??= live().sort()

		expect(scope.querySelectorAll(`.${item}`)).toHaveLength(ITEMS.length)
		expect(live().sort()).toEqual(mounted)
	}

	el.remove()

	expect(live()).toEqual([])
}

describe('Tabs над движком и владельцем снаружи', () => {
	it('переставленный трижды и снятый — на шинах владельца и движка ничего', async () => {
		const owner = new TTabs()
		const engine = createEngineTabs({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const el = document.createElement('div', { is: 'so-tabs' })

		if (!isTabs(el)) throw new Error('<div is="so-tabs"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-tabs-item')
	})
})

/** Как у Vue и Angular — на ListBox: строки элементов — кнопки на `div`. */
describe('ListBox над движком и владельцем снаружи', () => {
	it('переставленный трижды и снятый — на шинах владельца и движка ничего', async () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const el = document.createElement('div', { is: 'so-list-box' })

		if (!isListBox(el)) throw new Error('<div is="so-list-box"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-list-box-item')
	})
})

/**
 * Меню — пункты из данных в панели, увезённой в `body`: каждое подключение
 * собирает и меню, и панель с пунктами над тем же движком и владельцем.
 * Панель идёт за местом меню: перестановка одной операцией собирает её заново
 * сразу после меню, а снятое меню уводит её с собой тем же вызовом.
 */
describe('Menu над движком и владельцем снаружи', () => {
	it('переставленное трижды и снятое — на шинах владельца и движка ничего', async () => {
		const owner = new TMenu()
		const engine = createEngineMenu({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const el = document.createElement('span', { is: 'so-menu' })

		if (!isMenu(el)) throw new Error('<span is="so-menu"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-menu-item', document)

		expect(document.querySelector('.so-menu-item')).toBeNull()
	})
})

/** Набор тегов — теги из данных над движком снаружи, как у списка. */
describe('Tags над движком и владельцем снаружи', () => {
	it('переставленный трижды и снятый — на шинах владельца и движка ничего', async () => {
		const owner = new TTags({ closable: true })
		const engine = createEngineTags({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const el = document.createElement('div', { is: 'so-tags' })

		if (!isTags(el)) throw new Error('<div is="so-tags"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-tags-item')
	})
})

/**
 * Select — опции из данных в панели, увезённой в `body`, и поле — деталь Input
 * над экземпляром поля владельца: каждое подключение собирает Select, его поле
 * и панель с опциями над тем же движком и владельцем. Панель идёт за местом
 * Select, а снятый Select уводит её с собой тем же вызовом.
 */
describe('Select над движком и владельцем снаружи', () => {
	it('переставленный трижды и снятый — на шинах владельца, поля и движка ничего', async () => {
		const owner = new TSelect()
		const engine = createEngineSelect({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, owner.field.events, engine.events, ...extensions])
		const el = document.createElement('div', { is: 'so-select' })

		if (!isSelect(el)) throw new Error('<div is="so-select"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-select-item', document)

		expect(document.querySelector('.so-select-item')).toBeNull()
	})

	/**
	 * В `multiple` в поле — теги: экземпляр и коллекцию тегов держит движок
	 * Select, и деталь Tags над ними собирается на каждое подключение заново, а
	 * снятая на них ничего не оставляет.
	 */
	it('с тегами в поле — на шинах тегов и их коллекции тоже ничего', async () => {
		const owner = new TSelect()
		const engine = createEngineSelect({ owner, items: ITEMS })

		// Значение — у владельца, и уже в `multiple`: он источник выбора движка
		engine.extensions.selection.mode = 'multiple'
		owner.value = ['a', 'b']

		const tags = engine.extensions.tags.tags
		const tagsEngine = engine.extensions.tags.engine

		if (!tags || !tagsEngine) throw new Error('тегов нет')

		const tagBuses = Object.values(tagsEngine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([tags.events, tagsEngine.events, ...tagBuses])
		const el = document.createElement('div', { is: 'so-select' })

		if (!isSelect(el)) throw new Error('<div is="so-select"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-tags-item')
	})
})

/**
 * Как у Solid — на Pagination: страницы окна кладёт в движок расширение
 * пагинации по владельцу, а рисует шаблон — элементами страниц над ними. Две
 * страницы (`total` 20 по 10) — столько же, сколько элементов у соседей.
 */
describe('Pagination над движком и владельцем снаружи', () => {
	it('переставленная трижды и снятая — на шинах владельца и движка ничего', async () => {
		const owner = new TPagination({ total: 20, pageSize: 10 })
		const engine = createEnginePagination({ owner })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const el = document.createElement('nav', { is: 'so-pagination' })

		if (!isPagination(el)) throw new Error('<nav is="so-pagination"> нет')

		el.ctrl = owner
		el.engine = engine

		await moveThriceAndRemove(el, live, 'so-pagination-item')
	})
})

/** Владелец в опциях движка: без `ctrl` его собирает подключение. */
function ownerOf(engine: TListBoxCollection): TListBox {
	const owner = engine.options.get('owner')

	if (!(owner instanceof TListBox)) throw new Error('владельца у движка нет')

	return owner
}

/** Список над движком снаружи без `ctrl`, ещё не подключённый. */
function createListBox(engine: TListBoxCollection): TListBoxElementProps {
	const el = document.createElement('div', { is: 'so-list-box' })

	if (!isListBox(el)) throw new Error('<div is="so-list-box"> нет')

	el.engine = engine

	return el
}

/**
 * Без `ctrl` каждое подключение собирает своего владельца, а движок снаружи
 * тот же. Новый список подключён раньше, чем снят прежний: привязку забирает
 * новое подключение, а снятие прежнего её не трогает.
 */
describe('ListBox над движком снаружи без ctrl: новый подключён раньше, чем снят прежний', () => {
	it('движок у владельца нового подключения, после снятия на шинах ничего', async () => {
		const engine = createEngineListBox({ items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([engine.events, ...extensions])
		const previous = createListBox(engine)
		const next = createListBox(engine)
		const itemsDisabled = () =>
			[...next.querySelectorAll('.so-list-box-item')].map((item) =>
				item.getAttribute('data-disabled'),
			)

		document.body.appendChild(previous)
		await flush()

		const first = ownerOf(engine)

		document.body.appendChild(document.createElement('section')).appendChild(next)
		await flush()

		// Прежний ещё подключён, а движок — уже у нового владельца
		const second = ownerOf(engine)

		expect(second).not.toBe(first)

		previous.remove()
		await flush()

		// Снятие прежнего привязку не трогает, элементы нового на месте
		expect(ownerOf(engine)).toBe(second)
		expect(next.querySelectorAll('.so-list-box-item')).toHaveLength(ITEMS.length)

		// Прежний владелец отпущен: его `disabled` до элементов не доходит
		first.disabled = true
		await flush()

		expect(itemsDisabled()).not.toContain('true')

		// Подписки на нового живы: его `disabled` доходит до элементов
		next.disabled = true
		await flush()

		expect(itemsDisabled()).toEqual(['true', 'true'])

		next.remove()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})
})

/**
 * Как у Solid — на Table: строки — элементы частей над строками движка, у
 * каждой чекбокс выбора, в шапке — колонки с кнопкой сортировки и ручкой и
 * «выбрать все». Каждая перестановка — новые связки и таблицы, и строк, и
 * колонок, и чекбоксов над теми же экземплярами.
 */
describe('Table над движком и владельцем снаружи', () => {
	it('переставленная трижды и снятая — на шинах владельца, движка, строк и колонок ничего', async () => {
		const owner = new TTable()
		const engine = tableEngine(owner)
		const live = watchBuses([owner.events, ...tableBuses(engine)])
		const el = createTable(engine, owner)

		await moveThriceAndRemove(el, live, 'so-table-row')

		// Собиралась по-настоящему: кнопка сортировки, ручка и чекбоксы на месте
		expect(el.querySelectorAll('.so-table-column__sort')).toHaveLength(1)
		expect(el.querySelectorAll('.so-table-column__resizer')).toHaveLength(1)
		expect(el.querySelectorAll('.so-check-box')).toHaveLength(3)
	})

	/**
	 * Обёртка своей шины коллекции не отдаёт: на выключатель таблица
	 * подписывается при приёме и отписывается со снятием, — и окно, переставленное
	 * вместе с таблицей, на `ctrl` обёртки ничего не оставляет.
	 */
	it('в окне: на ctrl обёртки и шинах движка ничего', async () => {
		const virtual = new TVirtual()
		const engine = tableEngine()
		// Окно на каждом подключении — до слежки: своя подписка теста не в счёт
		const windows: boolean[] = []

		engine.extensions.draw.events.on('change:virtual', (on) => windows.push(on))

		const live = watchBuses([virtual.events, ...tableBuses(engine)])
		const el = document.createElement('so-virtual')

		if (!isVirtual(el)) throw new Error('<so-virtual> нет')

		el.ctrl = virtual
		el.appendChild(createTable(engine))

		await moveThriceAndRemove(el, live, 'so-table-row')

		// Подключение и три перестановки — окно на каждом, снятие — без окна
		expect(windows).toEqual([true, false, true, false, true, false, true, false])
		expect(engine.extensions.draw.virtual).toBe(false)
	})
})
