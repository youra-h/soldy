/**
 * Монтирование над движком и владельцем снаружи ничего не оставляет на их шинах.
 *
 * Движок и `ctrl`, переданные снаружи, живут дольше монтирования. Фасад
 * коллекции подписывается на расширения движка пробросом (`relayAll`), а
 * проброс держит источник, только пока цель слушают (`TEvented`): фасад уходит
 * с движка вместе со своими подписчиками — обменом адаптера. Здесь — настоящий
 * цикл Solid, как `ui/vue/__tests__/external-engine-lifetime.spec.ts` у Vue и
 * `ui/angular/__tests__/external-engine-lifetime.spec.ts` у Angular: три
 * монтирования ListBox, Table и Menu подряд, и на шинах владельца, движка и
 * его расширений ни подписки, ни перехватчика, ни слушателя обмена. У таблицы
 * сверх них — строки, колонки и чекбокс «выбрать все»: заголовки и чекбоксы
 * собираются над ними, как над `ctrl` снаружи, — и `ctrl` обёртки `Virtual`.
 * У меню — пункты из данных и подменю из данных со своим движком: строки и
 * подменю собираются над ними, как над `ctrl` и `engine` снаружи.
 *
 * Список над движком без `ctrl`, перенесённый в `<Show>` раньше по документу,
 * Solid собирает раньше, чем снимает прежний: привязку владельца забирает
 * новое монтирование, хотя прежнее ещё держит движок.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Show, createSignal } from 'solid-js'
import {
	TEvented,
	TListBox,
	TMenu,
	TTable,
	TVirtual,
	createEngineListBox,
	createEngineMenu,
	createEngineTable,
	type TListBoxCollection,
	type TMenuCollection,
	type TTableCollection,
} from '@soldy-ui/core'
import { ListBox, Menu, Table, Virtual } from '@soldy-ui/solid'
import { mount } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

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
 * Движок строк таблицы снаружи: две строки из данных, колонка с заголовком
 * строки, сортировкой и ручкой и выбор нескольких — так таблица рисует и
 * кнопку сортировки, и ручку, и колонку выбора.
 */
function tableEngine(): TTableCollection {
	const engine = createEngineTable({
		items: [{ data: { id: 1, name: 'A' } }, { data: { id: 2, name: 'B' } }],
	})

	engine.extensions.columns.columns = [
		{
			field: 'name',
			text: 'Имя',
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

describe('ListBox над движком и владельцем снаружи', () => {
	it('после нескольких монтирований на шинах владельца и движка ничего', () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])

		for (let i = 0; i < 3; i++) {
			const { container, destroy } = mount(() => <ListBox ctrl={owner} engine={engine} />)

			// Смонтирован по-настоящему: элементы на месте
			expect(container.querySelectorAll('.so-list-box-item')).toHaveLength(ITEMS.length)

			destroy()
		}

		expect(live()).toEqual([])
	})
})

/** Владелец в опциях движка: без `ctrl` его собирает монтирование. */
function ownerOf(engine: TListBoxCollection): TListBox {
	const owner = engine.options.get('owner')

	if (!(owner instanceof TListBox)) throw new Error('владельца у движка нет')

	return owner
}

/**
 * Без `ctrl` каждое монтирование собирает своего владельца, а движок снаружи
 * тот же. Solid обновляет вычисления в порядке подписки на сигнал: `<Show>`
 * раньше по документу собирает новый список до того, как `<Show>` после него
 * снимает прежний. Привязку забирает новое монтирование, а снятие прежнего её
 * не трогает.
 */
describe('ListBox над движком снаружи без ctrl, перенесённый за одно обновление', () => {
	it('перенос в <Show> раньше по документу: движок у владельца нового монтирования, после снятия на шинах ничего', () => {
		const engine = createEngineListBox({ items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([engine.events, ...extensions])
		const [swapped, setSwapped] = createSignal(false)
		const [disabled, setDisabled] = createSignal(false)
		const { container, destroy } = mount(() => (
			<>
				<Show when={swapped()}>
					<section class="so-test-second">
						<ListBox engine={engine} disabled={disabled()} />
					</section>
				</Show>
				<Show when={!swapped()}>
					<div class="so-test-first">
						<ListBox engine={engine} disabled={disabled()} />
					</div>
				</Show>
			</>
		))
		const itemsDisabled = () =>
			[...container.querySelectorAll('.so-list-box-item')].map((item) =>
				item.getAttribute('data-disabled'),
			)
		const first = ownerOf(engine)

		setSwapped(true)

		// Перенесён: элементы одного списка, движок — у нового владельца
		expect(container.querySelector('.so-test-first')).toBeNull()
		expect(container.querySelectorAll('.so-test-second .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(ownerOf(engine)).not.toBe(first)

		// Прежний владелец отпущен: его `disabled` до элементов не доходит
		first.disabled = true

		expect(itemsDisabled()).not.toContain('true')

		// Подписки на нового живы: его `disabled` доходит до элементов
		setDisabled(true)

		expect(itemsDisabled()).toEqual(['true', 'true'])

		destroy()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})
})

describe('Table над движком и владельцем снаружи', () => {
	it('после нескольких монтирований на шинах владельца, движка, строк и колонок ничего', () => {
		const owner = new TTable()
		const engine = tableEngine()
		const live = watchBuses([owner.events, ...tableBuses(engine)])

		for (let i = 0; i < 3; i++) {
			const { container, destroy } = mount(() => <Table ctrl={owner} engine={engine} />)

			// Смонтирована по-настоящему: строки, кнопка сортировки, ручка и чекбоксы
			expect(container.querySelectorAll('.so-table-row')).toHaveLength(2)
			expect(container.querySelectorAll('.so-table-column__sort')).toHaveLength(1)
			expect(container.querySelectorAll('.so-table-column__resizer')).toHaveLength(1)
			expect(container.querySelectorAll('.so-check-box')).toHaveLength(3)

			destroy()
		}

		expect(live()).toEqual([])
	})

	/**
	 * Обёртка своей шины коллекции не отдаёт: на выключатель таблица
	 * подписывается при приёме и отписывается со снятием.
	 */
	it('в окне: на ctrl обёртки и шинах движка ничего', () => {
		const virtual = new TVirtual()
		const engine = tableEngine()
		const live = watchBuses([virtual.events, ...tableBuses(engine)])

		for (let i = 0; i < 3; i++) {
			const { container, destroy } = mount(() => (
				<Virtual ctrl={virtual}>
					<Table engine={engine} />
				</Virtual>
			))

			expect(container.querySelectorAll('.so-table-row')).toHaveLength(2)
			expect(engine.extensions.draw.virtual).toBe(true)

			destroy()

			expect(engine.extensions.draw.virtual).toBe(false)
		}

		expect(live()).toEqual([])
	})
})

/** Шины движка меню: сам движок, расширения и пункты. */
function menuBuses(engine: TMenuCollection): TEvented<any>[] {
	return [
		engine.events,
		...Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		),
		...engine.extensions.batch.items.map((item) => item.events),
	]
}

describe('Menu над движком и владельцем снаружи', () => {
	/**
	 * Пункты меню из данных — экземпляры движка, а подменю из данных — пункт и
	 * движок его пунктов, которые заводит коллекция меню: строки, подменю и его
	 * пункты собираются над ними, как над `ctrl` и `engine` снаружи. Панели
	 * телепортированы, и пункты в них — тоже монтирования этого меню.
	 */
	it('после нескольких монтирований на шинах владельца, движка, пунктов и движка подменю ничего', () => {
		const owner = new TMenu()
		const engine = createEngineMenu({
			owner,
			items: [
				{ value: 'edit', text: 'Изменить' },
				{
					value: 'share',
					text: 'Поделиться',
					items: [
						{ value: 'link', text: 'Ссылка' },
						{ value: 'mail', text: 'Почта' },
					],
				},
			],
		})
		const submenus = [...engine.extensions.submenus.entries.values()]
		const live = watchBuses([
			owner.events,
			...menuBuses(engine),
			...submenus.flatMap((entry) => menuBuses(entry.engine)),
		])

		expect(submenus).toHaveLength(1)

		for (let i = 0; i < 3; i++) {
			const { destroy } = mount(() => <Menu ctrl={owner} engine={engine} />)

			// Смонтировано по-настоящему: пункты меню и пункты подменю — в панелях
			expect(document.querySelectorAll('.so-menu__panel')).toHaveLength(2)
			expect(document.querySelectorAll('.so-menu-item')).toHaveLength(4)

			destroy()

			expect(document.querySelector('.so-menu__panel')).toBeNull()
		}

		expect(live()).toEqual([])
	})
})
