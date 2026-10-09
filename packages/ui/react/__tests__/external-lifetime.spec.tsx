/**
 * Компонент над `ctrl` и движком снаружи не оставляет на них ничего — ни после
 * размонтирования, ни после сборок, которые React выбросил.
 *
 * `ctrl` и движок, переданные снаружи, живут дольше монтирования. Обычное
 * снятие освобождает их само: плагины снимают свои подписки, а фасады и
 * item-адаптеры держат движок, только пока их слушают (`TEvented`). Но React
 * собирает компонент на рендере и вправе выбросить рендер, ничего не сообщив:
 * сосед в той же группе `Suspense` ждёт данных. У выброшенной сборки нет ни
 * эффектов, ни `destroy()`, а её плагины уже подписаны. Один `ctrl` — один
 * компонент, один движок — один компонент, поэтому следующая сборка того же
 * `ctrl` или движка сначала уничтожает непринятую (`TDrafts`).
 *
 * Идёт по всем компонентам адаптера: компонент без строки в таблице роняет
 * сторож. Каждый — тремя сценариями: три монтирования подряд, `StrictMode`
 * (лишний цикл эффектов) и `Suspense` (две выброшенные сборки).
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
	TEvented,
	TFrame,
	TIcon,
	TInput,
	TLabel,
	TListBox,
	TProgressSpinner,
	TRadioGroup,
	TSkeleton,
	TSwitch,
	TTabs,
	TVirtual,
	createEngineAccordion,
	createEngineListBox,
	createEngineRadioGroup,
	createEngineTabs,
} from '@soldy-ui/core'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	Frame,
	Icon,
	Input,
	Label,
	ListBox,
	ProgressSpinner,
	RadioGroup,
	Skeleton,
	Switch,
	Tabs,
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
	Skeleton: {
		ctrl: overCtrl(
			() => new TSkeleton(),
			(ctrl) => <Skeleton ctrl={ctrl} />,
		),
	},
	Switch: {
		ctrl: overCtrl(
			() => new TSwitch(),
			(ctrl) => <Switch ctrl={ctrl} />,
		),
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
