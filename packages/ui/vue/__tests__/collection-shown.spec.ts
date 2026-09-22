/**
 * ListBox, Tabs, Accordion и Tags рисуют список из `shown`, а не `items` —
 * так же, как Select (см. `select-filter.spec.ts`).
 *
 * У этих компонентов нет своего расширения отбора, поэтому здесь фильтр не
 * заводится — узость `shown` создаётся напрямую подпиской на
 * `items:query:before` того движка, что коллекция отдаёт через
 * `onEngine:create`. Это тот же механизм, которым в ядре пользуется
 * `TFilterExtension`, только без самого расширения.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import { ListBox, Tabs, Accordion, Tags } from '@soldy-ui/vue'
import type { TCollectionEngine } from '@soldy-ui/core'

/** Движок, который коллекция отдаёт через `engine:create`: элементы с `value`. */
type TEngine = TCollectionEngine<{ readonly value: unknown }, any>

type TWrapper = ReturnType<typeof mount>

let wrapper: TWrapper | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** Сужает `shown` движка до элементов с чётным индексом — без расширения фильтра. */
function narrowShown(engine: TEngine) {
	const driver = engine.getCore().driver

	driver.events.on('items:query:before', (e) => {
		e.items = e.items.filter((item) => item.value !== 'b')
	})
	driver.invalidateQuery()
}

async function renderWith(
	component: Component,
	extraProps: Record<string, unknown> = {},
): Promise<{ wrapper: TWrapper; engine: TEngine }> {
	let engine: TEngine | undefined

	const mounted = mount(component, {
		props: {
			items: ITEMS,
			'onEngine:create': (value: TEngine) => {
				engine = value
			},
			...extraProps,
		},
		attachTo: document.body,
	})

	// модульная ссылка — только для размонтирования в afterEach
	wrapper = mounted

	await nextTick()
	await nextTick()

	if (!engine) throw new Error('engine:create не пришёл')

	return { wrapper: mounted, engine }
}

describe('ListBox: рендер из shown', () => {
	it('сузили shown — на экране меньше элементов, в коллекции все', async () => {
		const { wrapper, engine } = await renderWith(ListBox)

		expect(wrapper.findAllComponents(ListBox.Item).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper.findAllComponents(ListBox.Item).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})

describe('Tabs: рендер из shown', () => {
	it('сузили shown — на экране меньше вкладок, в коллекции все', async () => {
		const { wrapper, engine } = await renderWith(Tabs)

		expect(wrapper.findAllComponents(Tabs.Item).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper.findAllComponents(Tabs.Item).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})

describe('Accordion: рендер из shown', () => {
	it('сузили shown — на экране меньше панелей, в коллекции все', async () => {
		const { wrapper, engine } = await renderWith(Accordion)

		expect(wrapper.findAllComponents(Accordion.Item).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper.findAllComponents(Accordion.Item).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})

describe('Tags: рендер из shown', () => {
	it('сузили shown — на экране меньше тегов, в коллекции все', async () => {
		const { wrapper, engine } = await renderWith(Tags)

		expect(wrapper.findAllComponents(Tags.Item).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper.findAllComponents(Tags.Item).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})
