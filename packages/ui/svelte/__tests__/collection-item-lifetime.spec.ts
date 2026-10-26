/**
 * Элемент коллекции отпускает свой контекст при снятии.
 *
 * Фильтр прячет элемент из данных — компонент элемента снимается, а сам
 * элемент остаётся в коллекции; фильтр сняли — элемент монтируется снова.
 * Контекст элемента (`TItemContext`) живёт ровно одно монтирование: его
 * item-адаптеры подписаны на расширения движка, и контекст, который снятие не
 * отпустило, копил бы на движке подписчиков с каждым показом. Сторож по всем
 * коллекциям — `setup/__tests__/item-context-lifetime.spec.ts`, здесь —
 * настоящий цикл монтирования Svelte, как у Vue и React.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushSync } from 'svelte'
import { TEvented, TListBox, createEngine, createEngineListBox } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import { Accordion, ListBox, Menu, RadioGroup, Select, Tabs, Tags } from '@soldy-ui/svelte'
import { mount } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/**
 * Живые подписки шин движка — драйвера и каждого расширения: повешенные после
 * начала слежки и не снятые.
 */
function watchSubscriptions(engine: TCollectionEngine<any, any>): () => number {
	const extensions: Readonly<Record<string, { events?: unknown }>> = engine.extensions
	const spies = [
		engine.getCore().driver.events,
		...Object.values(extensions).map((e) => e.events),
	]
		.filter((bus) => bus instanceof TEvented)
		.map((bus) => ({ on: vi.spyOn(bus, 'on'), off: vi.spyOn(bus, 'off') }))

	return () =>
		spies.reduce(
			(live, { on, off }) =>
				live +
				on.mock.calls.filter(
					([event, handler]) =>
						!off.mock.calls.some(([e, h]) => e === event && h === handler),
				).length,
			0,
		)
}

/** Коллекции адаптера: все берут движок снаружи пропом `engine`. */
const COLLECTIONS: ReadonlyArray<readonly [string, (engine: TCollectionEngine<any, any>) => void]> =
	[
		['ListBox', (engine) => mount(ListBox, { engine })],
		['Tabs', (engine) => mount(Tabs, { engine })],
		['Accordion', (engine) => mount(Accordion, { engine })],
		['RadioGroup', (engine) => mount(RadioGroup, { engine })],
		['Tags', (engine) => mount(Tags, { engine })],
		// Options and items are in the panel Teleport mounts as its own root. From
		// data they are drawn from the panel's first opening on: open from the start
		['Select', (engine) => mount(Select, { engine, open: true })],
		['Menu', (engine) => mount(Menu, { engine, open: true })],
	]

describe.each(COLLECTIONS)('%s: фильтр прячет и показывает элемент', (_name, draw) => {
	it('подписок на движке не прибавляется с каждым показом', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const { driver } = engine.getCore()
		let hidden = false

		// Отбор без расширения фильтра — тот же механизм, что у `TFilterExtension`
		driver.events.on('items:query:before', (e) => {
			if (hidden) e.items = e.items.filter((item) => item.value !== 'b')
		})

		draw(engine)

		const live = watchSubscriptions(engine)

		const cycle = () => {
			hidden = true
			driver.invalidateQuery()
			flushSync()

			hidden = false
			driver.invalidateQuery()
			flushSync()
		}

		cycle()

		const afterFirst = live()

		cycle()
		cycle()

		expect(engine.extensions.batch.items).toHaveLength(2)
		expect(live()).toBe(afterFirst)
	})
})

describe('движок снаружи', () => {
	it('после снятия списка подписок на движке не остаётся', () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ITEMS })
		const live = watchSubscriptions(engine)
		const { destroy } = mount(ListBox, { ctrl: owner, engine })

		destroy()

		expect(live()).toBe(0)
	})
})
