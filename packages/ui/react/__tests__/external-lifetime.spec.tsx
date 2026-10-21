/**
 * Компонент над `ctrl` и движком снаружи не оставляет на них ничего — ни после
 * размонтирования, ни после сборок, которые React выбросил.
 *
 * `ctrl` и движок, переданные снаружи, живут дольше монтирования. Обычное
 * снятие освобождает их само: плагины снимают свои подписки, а фасады и
 * item-адаптеры держат движок, только пока их слушают (`TEvented`). Но React
 * собирает компонент на рендере и вправе выбросить рендер, ничего не сообщив:
 * сосед в той же группе `Suspense` ждёт данных. У выброшенной сборки нет ни
 * эффектов, ни `destroy()`, а её плагины уже подписаны. Поэтому следующая
 * сборка того же `ctrl` или движка сначала уничтожает непринятую (`TDrafts`).
 *
 * Идёт по всем компонентам адаптера: компонент без строки в таблице роняет
 * сторож. Каждый — тремя сценариями: три монтирования подряд, `StrictMode`
 * (лишний цикл эффектов) и `Suspense` (две выброшенные сборки).
 *
 * Движок без `ctrl` — своя группа: каждое монтирование собирает своего
 * владельца, и привязку владельца к движку держит последнее принятое. Смена
 * `key`, она же в `Suspense` и два живых компонента на одном движке: ошибки
 * нет, сборки, которые React отбросил, привязку не берут, снятие держателя
 * отдаёт её предыдущему живому, а на шинах движка после снятия ничего.
 */

import { describe, it, expect, vi } from 'vitest'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode, Suspense, act, use } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import {
	TAccordion,
	TButton,
	TCheckBox,
	TComponentView,
	TDialog,
	TDragAndDrop,
	TDrawer,
	TEvented,
	TField,
	TFrame,
	TIcon,
	TInput,
	TLabel,
	TListBox,
	TNumberInput,
	TPagination,
	TPopover,
	TProgressLinear,
	TProgressSpinner,
	TRadioGroup,
	TRating,
	TScroller,
	TSkeleton,
	TSlider,
	TSwitch,
	TTable,
	TTabs,
	TTextarea,
	TToasts,
	TTooltip,
	TVirtual,
	createEngineAccordion,
	createEngineListBox,
	createEnginePagination,
	createEngineRadioGroup,
	createEngineTable,
	createEngineTabs,
	createEngineToasts,
} from '@soldy-ui/core'
import type { TListBoxCollection, TTableCollection } from '@soldy-ui/core'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	Dialog,
	DragAndDrop,
	Drawer,
	Field,
	Frame,
	Icon,
	Input,
	Label,
	ListBox,
	NumberInput,
	Pagination,
	Popover,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	Rating,
	Scroller,
	Skeleton,
	Slider,
	Switch,
	Table,
	Tabs,
	Textarea,
	Toasts,
	Tooltip,
	Virtual,
} from '@soldy-ui/react'
import { nextFrame, track } from './mount'

/**
 * Что висит на шинах: подписка `on`, которую не сняли `off`, и перехватчик
 * `use`, которого не сняли. Пара «событие, обработчик» — одна подписка, как и
 * у самой шины.
 */
function watchBuses(buses: readonly TEvented<any>[]): () => string[] {
	const handlers = new Map<unknown, Set<string>>()
	const middlewares = new Set<object>()

	for (const bus of buses) {
		const on = bus.on.bind(bus)
		const off = bus.off.bind(bus)
		const original = bus.use.bind(bus)

		vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
			const events = handlers.get(handler) ?? new Set<string>()

			events.add(String(event))
			handlers.set(handler, events)
			on(event, handler)
		})
		vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
			handlers.get(handler)?.delete(String(event))
			off(event, handler)
		})
		vi.spyOn(bus, 'use').mockImplementation((middleware) => {
			const token = {}
			const release = original(middleware)

			middlewares.add(token)

			return () => {
				middlewares.delete(token)
				release()
			}
		})
	}

	return () => [
		...[...handlers.values()].flatMap((events) => [...events]),
		...[...middlewares].map(() => 'use'),
	]
}

/** Движок снаружи: его шина, шины расширений и элементов из данных. */
type TEngine = { events: TEvented<any>; extensions: object }

function engineBuses(engine: TEngine): TEvented<any>[] {
	const buses: TEvented<any>[] = [engine.events]

	for (const extension of Object.values(engine.extensions)) {
		const events: unknown = Reflect.get(Object(extension), 'events')

		if (events instanceof TEvented) buses.push(events)
	}

	const items: unknown = Reflect.get(Object(Reflect.get(engine.extensions, 'batch')), 'items')

	for (const item of Array.isArray(items) ? items : []) {
		const events: unknown = Reflect.get(Object(item), 'events')

		if (events instanceof TEvented) buses.push(events)
	}

	return buses
}

/**
 * Движок строк таблицы снаружи: две строки из данных, колонка с заголовком
 * строки и выбор нескольких — так таблица рисует и колонку выбора.
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

/**
 * Шины, которые таблица держит на движке сверх его расширений и строк:
 * экземпляры колонок — над ними рисуются заголовки — и чекбокс «выбрать все».
 * Оба живут на движке дольше монтирования.
 */
function tableBuses(engine: TTableCollection): TEvented<any>[] {
	return [
		...engine.extensions.columns.columns.map((column) => column.events),
		engine.extensions.table.selectAll.events,
	]
}

/** Ждёт обещания на рендере — так сосед ждёт данных. */
function Wait({ promise }: { promise: Promise<void> }) {
	use(promise)

	return null
}

/** Сценарий монтирования: смонтировать и вернуть размонтирование. */
type TScenario = (node: ReactNode) => Promise<() => void>

async function render(node: ReactNode): Promise<() => void> {
	const container = document.createElement('div')
	const root = createRoot(container)

	document.body.append(container)
	track(root)

	// Рендер с ожиданием — в асинхронном `act`: синхронный React не дождётся
	await act(async () => {
		root.render(node)
	})

	return () => act(() => root.render(<></>))
}

/**
 * Рисует `node` в группе `Suspense` с соседом, который ждёт данных: первые
 * сборки React выбрасывает, потом показывает группу.
 */
async function renderSuspended(node: ReactNode): Promise<() => void> {
	let resolve: () => void = () => {}
	const promise = new Promise<void>((done) => {
		resolve = done
	})
	const unmount = await render(
		<Suspense fallback={<p>…</p>}>
			{node}
			<Wait promise={promise} />
		</Suspense>,
	)

	await act(async () => {
		resolve()
		await promise
	})

	return unmount
}

const SCENARIOS: Readonly<Record<string, TScenario>> = {
	'три монтирования подряд': async (node) => {
		for (let i = 0; i < 2; i++) (await render(node))()

		return render(node)
	},
	StrictMode: (node) => render(<StrictMode>{node}</StrictMode>),
	Suspense: renderSuspended,
}

/** Что монтируем и чьи шины переживают монтирование. */
type TCase = () => { readonly node: ReactNode; readonly buses: TEvented<any>[] }

const ITEMS = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
]

/** Компонент над `ctrl` снаружи. */
function overCtrl<T extends { events: TEvented<any> }>(
	create: () => T,
	node: (ctrl: T) => ReactNode,
): TCase {
	return () => {
		const ctrl = create()

		return { node: node(ctrl), buses: [ctrl.events] }
	}
}

/**
 * Компоненты адаптера — ключ по имени компонента. У коллекции два случая:
 * `ctrl` и движок снаружи с элементами из данных и движок снаружи с
 * элементами в разметке.
 */
const COMPONENTS: Readonly<Record<string, Readonly<Record<string, TCase>>>> = {
	Accordion: {
		'ctrl и движок, элементы из данных': () => {
			const ctrl = new TAccordion()
			const engine = createEngineAccordion({ items: ITEMS })

			return {
				node: <Accordion ctrl={ctrl} engine={engine} />,
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
		'движок, элементы в разметке': () => {
			const engine = createEngineAccordion()

			return {
				node: (
					<Accordion engine={engine}>
						<Accordion.Item value="a" text="A" />
						<Accordion.Item value="b" text="B" />
					</Accordion>
				),
				buses: engineBuses(engine),
			}
		},
	},
	Button: {
		ctrl: overCtrl(
			() => new TButton(),
			(ctrl) => <Button ctrl={ctrl} />,
		),
	},
	CheckBox: {
		ctrl: overCtrl(
			() => new TCheckBox(),
			(ctrl) => <CheckBox ctrl={ctrl} />,
		),
	},
	ComponentView: {
		ctrl: overCtrl(
			() => new TComponentView(),
			(ctrl) => <ComponentView ctrl={ctrl} />,
		),
	},
	/**
	 * Видимое окно: у открытого подписаны все плагины модального слоя — фокус,
	 * немой фон, замок прокрутки, нажатие мимо.
	 */
	Dialog: {
		'ctrl видим': overCtrl(
			() => new TDialog({ visible: true }),
			(ctrl) => <Dialog ctrl={ctrl}>Содержимое</Dialog>,
		),
	},
	/**
	 * Обёртка опускает коллекции свой экземпляр, и плагин перетаскивания списка
	 * держит его, пока жив набор списка. У списка из `items` нет ни `ctrl`, ни
	 * движка снаружи — выброшенную сборку такого списка освободить некому, и
	 * то, что она взяла у обёртки, осталось бы на её `ctrl` навсегда.
	 */
	DragAndDrop: {
		'ctrl обёртки и движок списка': () => {
			const ctrl = new TDragAndDrop()
			const engine = createEngineListBox({ items: ITEMS })

			return {
				node: (
					<DragAndDrop ctrl={ctrl}>
						<ListBox engine={engine} />
					</DragAndDrop>
				),
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
		'ctrl обёртки, список из items': () => {
			const ctrl = new TDragAndDrop()

			return {
				node: (
					<DragAndDrop ctrl={ctrl}>
						<ListBox items={ITEMS} />
					</DragAndDrop>
				),
				buses: [ctrl.events],
			}
		},
	},
	/** Видимая панель — как окно, и ещё жест. */
	Drawer: {
		'ctrl видим': overCtrl(
			() => new TDrawer({ visible: true }),
			(ctrl) => <Drawer ctrl={ctrl}>Содержимое</Drawer>,
		),
	},
	/**
	 * Поле — над своим `ctrl` и `ctrl` контрола: связка контрола с полем
	 * подписывается на шины обоих — ошибку поля, свой `id` и labelable, — и
	 * снять обязана обе.
	 */
	Field: {
		'ctrl поля и ctrl контрола': () => {
			const field = new TField({ label: 'Почта', helper: 'Подсказка' })
			const input = new TInput()

			return {
				node: (
					<Field ctrl={field}>
						<Input ctrl={input} />
					</Field>
				),
				buses: [field.events, input.events],
			}
		},
	},
	Frame: {
		ctrl: overCtrl(
			() => new TFrame(),
			(ctrl) => <Frame ctrl={ctrl} />,
		),
	},
	Icon: {
		ctrl: overCtrl(
			() => new TIcon({ tag: 'i' }),
			(ctrl) => <Icon ctrl={ctrl} />,
		),
	},
	Input: {
		ctrl: overCtrl(
			() => new TInput(),
			(ctrl) => <Input ctrl={ctrl} />,
		),
	},
	Label: {
		ctrl: overCtrl(
			() => new TLabel(),
			(ctrl) => <Label ctrl={ctrl} text="Подпись" />,
		),
	},
	ListBox: {
		'ctrl и движок, элементы из данных': () => {
			const ctrl = new TListBox()
			const engine = createEngineListBox({ items: ITEMS })

			return {
				node: <ListBox ctrl={ctrl} engine={engine} />,
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
		'движок, элементы в разметке': () => {
			const engine = createEngineListBox()

			return {
				node: (
					<ListBox engine={engine}>
						<ListBox.Item value="a" text="A" />
						<ListBox.Item value="b" text="B" />
					</ListBox>
				),
				buses: engineBuses(engine),
			}
		},
	},
	NumberInput: {
		ctrl: overCtrl(
			() => new TNumberInput({ value: 5 }),
			(ctrl) => <NumberInput ctrl={ctrl} clearable />,
		),
	},
	/**
	 * Страницы окна кладёт в коллекцию расширение пагинации, когда приходит
	 * владелец, поэтому случай один: движок снаружи без своих страниц.
	 * Владельца в опции движка пишет монтирование, а снятие его отпускает — и
	 * расширение отписывается от `ctrl`.
	 */
	Pagination: {
		'ctrl и движок, страницы окна': () => {
			const ctrl = new TPagination({ total: 30, value: 2 })
			const engine = createEnginePagination()

			return {
				node: <Pagination ctrl={ctrl} engine={engine} />,
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
	},
	/**
	 * Открытый поповер: у открытого подписаны фокус и нажатие мимо, а якорем
	 * панели служит корень — значение рендера, подписка на ref корня.
	 */
	Popover: {
		'ctrl открыт': overCtrl(
			() => new TPopover({ open: true }),
			(ctrl) => <Popover ctrl={ctrl}>Содержимое</Popover>,
		),
	},
	ProgressLinear: {
		ctrl: overCtrl(
			() => new TProgressLinear(),
			(ctrl) => <ProgressLinear ctrl={ctrl} />,
		),
	},
	ProgressSpinner: {
		ctrl: overCtrl(
			() => new TProgressSpinner(),
			(ctrl) => <ProgressSpinner ctrl={ctrl} />,
		),
	},
	RadioGroup: {
		'ctrl и движок, элементы из данных': () => {
			const ctrl = new TRadioGroup()
			const engine = createEngineRadioGroup({ items: [{ value: 'a' }, { value: 'b' }] })

			return {
				node: <RadioGroup ctrl={ctrl} engine={engine} />,
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
		'движок, элементы в разметке': () => {
			const engine = createEngineRadioGroup()

			return {
				node: (
					<RadioGroup engine={engine}>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item value="b" />
					</RadioGroup>
				),
				buses: engineBuses(engine),
			}
		},
	},
	Rating: {
		ctrl: overCtrl(
			() => new TRating(),
			(ctrl) => <Rating ctrl={ctrl} />,
		),
	},
	Scroller: {
		ctrl: overCtrl(
			() => new TScroller(),
			(ctrl) => (
				<Scroller ctrl={ctrl}>
					<span>A</span>
				</Scroller>
			),
		),
	},
	Skeleton: {
		ctrl: overCtrl(
			() => new TSkeleton(),
			(ctrl) => <Skeleton ctrl={ctrl} />,
		),
	},
	Slider: {
		ctrl: overCtrl(
			() => new TSlider({ value: [20, 80] }),
			(ctrl) => <Slider ctrl={ctrl} />,
		),
	},
	Switch: {
		ctrl: overCtrl(
			() => new TSwitch(),
			(ctrl) => <Switch ctrl={ctrl} />,
		),
	},
	/**
	 * Строки таблица рисует только данными, поэтому случай один. Сверх шин
	 * движка — колонки и чекбокс «выбрать все»: заголовки и CheckBox шапки
	 * собираются над ними, как над `ctrl` снаружи.
	 */
	Table: {
		'ctrl и движок, строки из данных': () => {
			const ctrl = new TTable()
			const engine = tableEngine()

			return {
				node: <Table ctrl={ctrl} engine={engine} />,
				buses: [ctrl.events, ...engineBuses(engine), ...tableBuses(engine)],
			}
		},
	},
	Tabs: {
		'ctrl и движок, элементы из данных': () => {
			const ctrl = new TTabs()
			const engine = createEngineTabs({ items: ITEMS })

			return {
				node: <Tabs ctrl={ctrl} engine={engine} />,
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
		'движок, табы и панели в разметке': () => {
			const engine = createEngineTabs()

			return {
				node: <TabsOver engine={engine} />,
				buses: engineBuses(engine),
			}
		},
	},
	Textarea: {
		ctrl: overCtrl(
			() => new TTextarea(),
			(ctrl) => <Textarea ctrl={ctrl} />,
		),
	},
	/**
	 * Тосты приходят из кода, поэтому случай один: движок снаружи с тостом,
	 * показанным до монтирования. Регион рисует его тостом — с плагинами жеста
	 * и имени крестика, — отсчёт идёт по нему, а владельца в опции движка пишет
	 * монтирование. Снятие отпускает и тост, и движок, и `ctrl`.
	 */
	Toasts: {
		'ctrl и движок, показанный тост': () => {
			const ctrl = new TToasts()
			const engine = createEngineToasts()

			engine.extensions.toasts.show('Сохранено')

			return {
				node: (
					<Toasts ctrl={ctrl} engine={engine}>
						<main>Приложение</main>
					</Toasts>
				),
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
	},
	/** Открытая подсказка — как поповер: показ ведёт плагин наведения. */
	Tooltip: {
		'ctrl открыт': overCtrl(
			() => new TTooltip({ open: true }),
			(ctrl) => <Tooltip ctrl={ctrl}>Подсказка</Tooltip>,
		),
	},
	/**
	 * Обёртка своей шины коллекции не отдаёт: на выключатель коллекция
	 * подписывается при коммите. У списка из `items` нет ни `ctrl`, ни движка
	 * снаружи — выброшенную сборку такого списка освободить некому, и
	 * подписка на рендере осталась бы на `ctrl` обёртки навсегда.
	 */
	Virtual: {
		'ctrl обёртки и движок списка': () => {
			const ctrl = new TVirtual()
			const engine = createEngineListBox({ items: ITEMS })

			return {
				node: (
					<Virtual ctrl={ctrl}>
						<ListBox engine={engine} />
					</Virtual>
				),
				buses: [ctrl.events, ...engineBuses(engine)],
			}
		},
		'ctrl обёртки, список из items': () => {
			const ctrl = new TVirtual()

			return {
				node: (
					<Virtual ctrl={ctrl}>
						<ListBox items={ITEMS} />
					</Virtual>
				),
				buses: [ctrl.events],
			}
		},
		'ctrl обёртки и движок таблицы': () => {
			const ctrl = new TVirtual()
			const engine = tableEngine()

			return {
				node: (
					<Virtual ctrl={ctrl}>
						<Table engine={engine} />
					</Virtual>
				),
				buses: [ctrl.events, ...engineBuses(engine), ...tableBuses(engine)],
			}
		},
	},
}

/** Табы и панели из разметки над движком снаружи. */
function TabsOver({ engine }: { engine: ReturnType<typeof createEngineTabs> }): ReactNode {
	return (
		<Tabs
			engine={engine}
			content={
				<>
					<Tabs.Content value="a">Панель A</Tabs.Content>
					<Tabs.Content value="b">Панель B</Tabs.Content>
				</>
			}
		>
			<Tabs.Item value="a" text="First" active />
			<Tabs.Item value="b" text="Second" />
		</Tabs>
	)
}

/** Компоненты адаптера: у каждого в папке `src/components` свой `<Имя>.tsx`. */
function adapterComponents(): string[] {
	const root = resolve(import.meta.dirname, '../src/components')

	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.flatMap((entry) =>
			readdirSync(resolve(root, entry.name))
				.filter((file) => /^[A-Z]\w*\.tsx$/.test(file))
				.map((file) => file.replace(/\.tsx$/, '')),
		)
}

const ENTRIES = Object.entries(COMPONENTS).flatMap(([component, cases]) =>
	Object.entries(cases).flatMap(([name, make]) =>
		Object.entries(SCENARIOS).map(
			([scenario, mount]) => [`${component} · ${name} · ${scenario}`, make, mount] as const,
		),
	),
)

describe('сторож: компонент над ctrl и движком снаружи ничего на них не оставляет', () => {
	it('таблица покрывает каждый компонент адаптера', () => {
		expect(Object.keys(COMPONENTS).sort()).toEqual(adapterComponents().sort())
	})

	it.each(ENTRIES)('%s', async (_name, make, mount) => {
		const { node, buses } = make()
		const live = watchBuses(buses)
		const unmount = await mount(node)

		unmount()

		expect(live()).toEqual([])
	})
})

describe('сборка, принятая после выброшенных, работает', () => {
	it('Button: фокус ядра доходит до узла', async () => {
		const ctrl = new TButton({ text: 'Сохранить' })

		await renderSuspended(<Button ctrl={ctrl} />)
		await nextFrame()

		act(() => {
			ctrl.focused = true
		})

		expect(document.activeElement?.textContent).toBe('Сохранить')
	})

	it('Tabs: активация в движке доходит до разметки', async () => {
		const engine = createEngineTabs()

		await renderSuspended(<TabsOver engine={engine} />)

		const second = engine.extensions.batch.items.find((item) => item.value === 'b')

		if (!second) throw new Error('таба b в движке нет')

		act(() => {
			engine.extensions.activation.activate(second)
		})

		const selected = [...document.querySelectorAll('[role="tab"]')].map((tab) =>
			tab.getAttribute('aria-selected'),
		)

		expect(selected).toEqual(['false', 'true'])
	})
})

/** Владелец в опциях движка: без `ctrl` его собирает монтирование. */
function ownerOf(engine: TListBoxCollection): TListBox {
	const owner = engine.options.get('owner')

	if (!(owner instanceof TListBox)) throw new Error('владельца у движка нет')

	return owner
}

/** `data-disabled` элементов списков в документе. */
function itemsDisabled(): (string | null)[] {
	return [...document.querySelectorAll('.so-list-box-item')].map((item) =>
		item.getAttribute('data-disabled'),
	)
}

/**
 * Корень React в документе: перерисовка тем же корнем — в асинхронном `act`,
 * чтобы дождаться ожидания, — и снятие всего, что в нём нарисовано.
 */
function rootInDocument(): { render: (node: ReactNode) => Promise<void>; unmount: () => void } {
	const container = document.createElement('div')
	const root = createRoot(container)

	document.body.append(container)
	track(root)

	return {
		render: async (node) => {
			await act(async () => {
				root.render(node)
			})
		},
		unmount: () => act(() => root.render(<></>)),
	}
}

/**
 * Без `ctrl` каждое монтирование собирает своего владельца, а движок снаружи
 * тот же. Привязку владельца держит последнее принятое монтирование. Приём и
 * снятие в одном коммите у React не перекрываются: очистки удалённых идут
 * раньше эффектов новых. Сборки, которые React отбросил, привязку не берут —
 * она идёт на приёме, а их уничтожает `TDrafts`.
 */
describe('движок без ctrl', () => {
	it('смена key: движок у владельца нового монтирования, после снятия на шинах ничего', async () => {
		const engine = createEngineListBox({ items: ITEMS })
		const live = watchBuses(engineBuses(engine))
		const root = rootInDocument()

		await root.render(<ListBox key="first" engine={engine} />)

		const first = ownerOf(engine)

		await root.render(<ListBox key="second" engine={engine} />)

		expect(ownerOf(engine)).not.toBe(first)

		// Прежний владелец отпущен: его `disabled` до элементов не доходит
		act(() => {
			first.disabled = true
		})

		expect(itemsDisabled()).not.toContain('true')

		// Подписки на нового живы: его `disabled` доходит до элементов
		await root.render(<ListBox key="second" engine={engine} disabled />)

		expect(itemsDisabled()).toEqual(['true', 'true'])

		root.unmount()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})

	it('смена key в Suspense: отброшенные сборки нового привязку не берут, принятая — берёт, после снятия на шинах ничего', async () => {
		const engine = createEngineListBox({ items: ITEMS })
		const live = watchBuses(engineBuses(engine))
		const root = rootInDocument()
		let resolve: () => void = () => {}
		const promise = new Promise<void>((done) => {
			resolve = done
		})

		await root.render(
			<Suspense fallback={<p>…</p>}>
				<ListBox key="first" engine={engine} />
			</Suspense>,
		)

		const first = ownerOf(engine)

		// Новый список в группе с соседом, который ждёт данных: его сборки React
		// отбрасывает, и привязка остаётся у прежнего
		await root.render(
			<Suspense fallback={<p>…</p>}>
				<ListBox key="second" engine={engine} disabled />
				<Wait promise={promise} />
			</Suspense>,
		)

		expect(ownerOf(engine)).toBe(first)

		await act(async () => {
			resolve()
			await promise
		})

		// Группа показана: прежний снят, движок — у принятого нового
		expect(ownerOf(engine)).not.toBe(first)
		expect(itemsDisabled()).toEqual(['true', 'true'])

		root.unmount()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})

	/**
	 * Договор «один движок — один компонент» нарушен, а ошибки нет: в окне
	 * перемонтирования два владельца законны, и отличить их от ошибки
	 * потребителя нельзя. Сборки соседей, собранных одним рендером, уничтожают
	 * черновики друг друга, эффект пересобирает уничтоженную, и на каждый
	 * живой компонент остаётся одна сборка.
	 */
	it('два живых компонента на одном движке: ошибки нет, движок у последнего принятого, после его снятия — у первого', async () => {
		const engine = createEngineListBox({ items: ITEMS })
		const live = watchBuses(engineBuses(engine))
		const root = rootInDocument()
		const both = (first: boolean, second: boolean) => (
			<>
				<ListBox key="first" engine={engine} disabled={first} />
				<ListBox key="second" engine={engine} disabled={second} />
			</>
		)

		await root.render(both(false, false))

		const second = ownerOf(engine)

		// Движок — у последнего принятого: его `disabled` доходит до элементов
		await root.render(both(false, true))

		expect(itemsDisabled()).toEqual(['true', 'true', 'true', 'true'])

		// `disabled` первого — нет
		await root.render(both(true, false))

		expect(itemsDisabled()).not.toContain('true')

		// Снят последний: привязка вернулась к первому, и его `disabled` на месте
		await root.render(<ListBox key="first" engine={engine} disabled />)

		expect(ownerOf(engine)).not.toBe(second)
		expect(itemsDisabled()).toEqual(['true', 'true'])

		root.unmount()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})
})
