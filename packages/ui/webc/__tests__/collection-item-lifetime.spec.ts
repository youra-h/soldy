/**
 * Элемент коллекции отпускает свой контекст при снятии.
 *
 * Фильтр прячет элемент из данных — петля владельца снимает его элемент, а
 * сам элемент данных остаётся в коллекции; фильтр сняли — петля строит
 * элемент снова, и он собирается. Контекст элемента (`TItemContext`) живёт
 * ровно одно подключение: его item-адаптеры подписаны на расширения движка, и
 * контекст, который снятие не отпустило, копил бы на движке подписчиков с
 * каждым показом. Сторож по всем коллекциям —
 * `setup/__tests__/item-context-lifetime.spec.ts`, здесь — настоящий цикл Web
 * Components, как у Vue, React, Svelte, Solid и Angular.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TEvented, TTabs, createEngine, createEngineTabs } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import {
	TAccordionElement,
	TRadioGroupElement,
	TTabsElement,
	type TAccordionElementProps,
	type TRadioGroupElementProps,
	type TTabsElementProps,
} from '@soldy-ui/webc'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
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

/** Владелец коллекции, как его видит тест: движок — свойство элемента. */
type TOwner = TTabsElementProps | TAccordionElementProps | TRadioGroupElementProps

function isTabs(node: Element): node is TTabsElementProps {
	return node instanceof TTabsElement
}

/** Коллекции адаптера: все берут движок снаружи свойством `engine`. */
const COLLECTIONS: ReadonlyArray<readonly [string, string, (node: Element) => node is TOwner]> = [
	['Tabs', 'so-tabs', (node): node is TOwner => node instanceof TTabsElement],
	['Accordion', 'so-accordion', (node): node is TOwner => node instanceof TAccordionElement],
	['RadioGroup', 'so-radio-group', (node): node is TOwner => node instanceof TRadioGroupElement],
]

/** Владелец над движком снаружи — кодом, движок свойством до вставки. */
function mountOver(
	is: string,
	guard: (node: Element) => node is TOwner,
	engine: TCollectionEngine<any, any>,
): TOwner {
	const el = document.createElement('div', { is })

	if (!guard(el)) throw new Error(`<div is="${is}"> нет`)

	el.engine = engine
	document.body.appendChild(el)

	return el
}

describe.each(COLLECTIONS)('%s: фильтр прячет и показывает элемент', (_name, is, guard) => {
	it('подписок на движке не прибавляется с каждым показом', async () => {
		const items = createEngine<TItem>({ items: ITEMS })
		const { driver } = items.getCore()
		let hidden = false

		// Отбор без расширения фильтра — тот же механизм, что у `TFilterExtension`
		driver.events.on('items:query:before', (e) => {
			if (hidden) e.items = e.items.filter((item) => item.value !== 'b')
		})

		const el = mountOver(is, guard, items)

		await flush()

		const live = watchSubscriptions(items)
		const shown = () => el.querySelectorAll(`[class~="${is}-item"]`).length

		const cycle = async () => {
			hidden = true
			driver.invalidateQuery()
			await flush()

			expect(shown()).toBe(1)

			hidden = false
			driver.invalidateQuery()
			await flush()

			expect(shown()).toBe(2)
		}

		await cycle()

		const afterFirst = live()

		await cycle()
		await cycle()

		expect(items.extensions.batch.items).toHaveLength(2)
		expect(live()).toBe(afterFirst)
	})
})

describe('движок снаружи', () => {
	it('после снятия набора подписок на движке не остаётся', async () => {
		const owner = new TTabs()
		const external = createEngineTabs({ owner, items: ITEMS })
		const live = watchSubscriptions(external)
		const el = document.createElement('div', { is: 'so-tabs' })

		if (!isTabs(el)) throw new Error('<div is="so-tabs"> нет')

		el.ctrl = owner
		el.engine = external
		document.body.appendChild(el)
		await flush()

		expect(el.querySelectorAll('.so-tabs-item')).toHaveLength(ITEMS.length)

		el.remove()

		expect(live()).toBe(0)
	})
})
