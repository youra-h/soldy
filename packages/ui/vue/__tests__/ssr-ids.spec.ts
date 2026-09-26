/**
 * Автоматические `id` в разметке — от места компонента в дереве, а не от
 * счётчика ядра.
 *
 * Поле, связка «таб ↔ панель», имя группы радио строят `id` от основы экземпляра
 * (`IComponentView.idBase`). Раньше основой был `uid` — счётчик экземпляров
 * процесса: на сервере он общий для всех запросов, в браузере начинается
 * заново, и гидратация видела другие `id`. Теперь основу даёт `useId` Vue
 * через `createVueAdapterContext`, а элементам из данных (`items`) — основа
 * владельца и номер по порядку создания.
 *
 * Сервер и браузер здесь — один процесс: рендер сервера уже сдвинул счётчик,
 * и экземпляры гидратации получают другие `uid`, как в настоящем браузере.
 */

// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { createSSRApp, h, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
	Accordion,
	Input,
	RadioGroup,
	RadioGroupItem,
	Tabs,
	TabsContent,
	TabsItem,
} from '@soldy-ui/vue'

const containers: HTMLElement[] = []

afterEach(() => {
	for (const container of containers.splice(0)) container.remove()
})

/** Рендер сервера и гидратация той же разметки; предупреждения Vue — наружу. */
async function hydrate(render: () => VNode): Promise<{
	server: HTMLElement
	client: HTMLElement
	warnings: string[]
}> {
	const html = await renderToString(createSSRApp({ render }))
	const server = document.createElement('div')
	const client = document.createElement('div')
	const warnings: string[] = []

	server.innerHTML = html
	client.innerHTML = html
	document.body.append(client)
	containers.push(client)

	const app = createSSRApp({ render })

	app.config.warnHandler = (message) => warnings.push(message)
	app.mount(client)

	return { server, client, warnings }
}

const attrs = (root: HTMLElement, selector: string, name: string) =>
	[...root.querySelectorAll(selector)].map((element) => element.getAttribute(name))

describe('автоматические id при гидратации', () => {
	it('поле: id у сервера и браузера один, у соседей — разный, гидратация без расхождений', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h('div', [h(Input, { value: 'a' }), h(Input, { value: 'b' })]),
		)
		const ids = attrs(client, 'input', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, 'input', 'id'))
		expect(new Set(ids).size).toBe(2)
		expect(ids.every((id) => !!id)).toBe(true)
	})

	it('заданный id — как есть', async () => {
		const { client, warnings } = await hydrate(() => h(Input, { id: 'field', value: 'a' }))

		expect(warnings).toEqual([])
		expect(attrs(client, 'input', 'id')).toEqual(['field'])
	})

	it('табы из разметки: связка «таб ↔ панель» у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Tabs, null, {
				default: () => [
					h(TabsItem, { value: 'a', text: 'A', active: true }),
					h(TabsItem, { value: 'b', text: 'B' }),
				],
				content: () => [
					h(TabsContent, { value: 'a' }, () => 'Панель A'),
					h(TabsContent, { value: 'b' }, () => 'Панель B'),
				],
			}),
		)
		const controls = attrs(client, '[role="tab"]', 'aria-controls')

		expect(warnings).toEqual([])
		expect(attrs(client, '[role="tab"]', 'id')).toEqual(attrs(server, '[role="tab"]', 'id'))
		expect(controls).toEqual(attrs(server, '[role="tab"]', 'aria-controls'))
		expect(attrs(client, '.s-tabs__panel', 'id')).toEqual([controls[0]])
	})

	const items = [
		{ value: 'a', text: 'A' },
		{ value: 'b', text: 'B' },
	]

	it('табы из данных: связка у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() => h(Tabs, { items }))
		const ids = attrs(client, '[role="tab"]', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, '[role="tab"]', 'id'))
		expect(new Set(ids).size).toBe(2)
	})

	it('секции Accordion из данных: связка у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() => h(Accordion, { items }))

		expect(warnings).toEqual([])
		expect(attrs(client, '[aria-controls]', 'aria-controls')).toEqual(
			attrs(server, '[aria-controls]', 'aria-controls'),
		)
	})

	it('группа радио без своего имени: общий name у сервера и браузера один', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(RadioGroup, null, () => [
				h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
				h(RadioGroupItem, { value: 'b' }, () => 'Второй'),
			]),
		)
		const names = attrs(client, 'input', 'name')

		expect(warnings).toEqual([])
		expect(names).toEqual(attrs(server, 'input', 'name'))
		expect(new Set(names).size).toBe(1)
	})
})
