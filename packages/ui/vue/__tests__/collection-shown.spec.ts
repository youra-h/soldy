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
import { nextTick } from 'vue'
import { ListBox, Tabs, Accordion, Tags } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

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
function narrowShown(engine: any) {
	const driver = engine.getCore().driver

	driver.events.on('items:query:before', (e: any) => {
		e.items = e.items.filter((item: any) => item.value !== 'b')
	})
	driver.invalidateQuery()
}

async function renderWith(component: any, extraProps: Record<string, unknown> = {}) {
	let engine: any

	wrapper = mount(component, {
		props: {
			items: ITEMS,
			'onEngine:create': (value: any) => {
				engine = value
			},
			...extraProps,
		},
		attachTo: document.body,
	})

	await nextTick()
	await nextTick()

	return engine
}

describe('ListBox: рендер из shown', () => {
	it('сузили shown — на экране меньше элементов, в коллекции все', async () => {
		const engine = await renderWith(ListBox)

		expect(wrapper!.findAllComponents(ListBox.Item as never).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper!.findAllComponents(ListBox.Item as never).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})

describe('Tabs: рендер из shown', () => {
	it('сузили shown — на экране меньше вкладок, в коллекции все', async () => {
		const engine = await renderWith(Tabs)

		expect(wrapper!.findAllComponents(Tabs.Item as never).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper!.findAllComponents(Tabs.Item as never).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})

describe('Accordion: рендер из shown', () => {
	it('сузили shown — на экране меньше панелей, в коллекции все', async () => {
		const engine = await renderWith(Accordion)

		expect(wrapper!.findAllComponents(Accordion.Item as never).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper!.findAllComponents(Accordion.Item as never).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})

describe('Tags: рендер из shown', () => {
	it('сузили shown — на экране меньше тегов, в коллекции все', async () => {
		const engine = await renderWith(Tags)

		expect(wrapper!.findAllComponents(Tags.Item as never).length).toBe(3)

		narrowShown(engine)
		await nextTick()

		expect(wrapper!.findAllComponents(Tags.Item as never).length).toBe(2)
		expect(engine.extensions.batch.items.length).toBe(3)
	})
})
