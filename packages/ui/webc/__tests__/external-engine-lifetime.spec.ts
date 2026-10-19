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
 * у Angular: набор табов, список и таблица, переставленные трижды и снятые, и
 * на шинах владельца, движка и его расширений ни подписки, ни перехватчика, ни
 * слушателя обмена. У таблицы — ещё строки, колонки и «выбрать все»: их держат
 * элементы частей и чекбоксы, а в окне `<so-virtual>` — и выключатель обёртки.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import {
	TEvented,
	TListBox,
	TTable,
	TTabs,
	TVirtual,
	createEngineListBox,
	createEngineTable,
	createEngineTabs,
	type TTableCollection,
} from '@soldy-ui/core'
import {
	TListBoxElement,
	TTableElement,
	TTabsElement,
	TVirtualElement,
	type TListBoxElementProps,
	type TTableElementProps,
	type TTabsElementProps,
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
 * Набор над движком и владельцем снаружи — переставленный трижды и снятый.
 * После каждой перестановки он собран по-настоящему (элементы на месте) и
 * одной сборкой — прежние ушли, а после снятия на шинах ничего.
 */
async function moveThriceAndRemove(
	el: HTMLElement,
	live: () => string[],
	item: string,
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

		expect(el.querySelectorAll(`.${item}`)).toHaveLength(ITEMS.length)
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
