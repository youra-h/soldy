/**
 * Коллекции разметкой на сервере и гидратация их разметки.
 *
 * Элемент разметки входит в коллекцию в своём `setup()`, а он идёт и на
 * сервере, — сервер рисует элемент с тем, что коллекция пишет ему на входе.
 * Но разметку сервер Vue пишет строкой по ходу сборки, в порядке документа, и
 * в неё не попадает то, что вход следующего элемента меняет у уже
 * нарисованных. Таб выше активного и тег выше выбранного вошли первыми и
 * держали остановку Tab как первый доступный — с ней сервер их и нарисовал, а
 * активный забрал её, когда их разметка была уже отдана. До гидратации
 * остановок две — цена серверной разметки (`docs/agents/collections.md`,
 * «Цена»).
 *
 * Гидратация сходится: браузер собирает элементы в том же порядке и рисует
 * элемент выше с той же остановкой, что у сервера, а когда входит активный,
 * снимает её перерисовкой.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { h, nextTick } from 'vue'
import { Tabs, TabsItem, Tags, TagsItem } from '@soldy-ui/vue'
import { hydrate, unmountHydrated } from './hydrate'

afterEach(unmountHydrated)

/** `tabindex` строк с ролью `role` — по порядку. */
const stops = (root: HTMLElement, role: string) =>
	[...root.querySelectorAll(`[role="${role}"]`)].map((row) => row.getAttribute('tabindex'))

describe('Tabs · сервер и гидратация', () => {
	it('табы разметки, активный вторым: у таба выше вторая остановка Tab — цена сервера, см. «Цена»; гидратация её снимает', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Tabs, null, () => [
				h(TabsItem, { value: 'a', text: 'A' }),
				h(TabsItem, { value: 'b', text: 'B', active: true }),
			]),
		)

		expect(stops(server, 'tab')).toEqual(['0', '0'])

		await nextTick()

		expect(warnings).toEqual([])
		expect(stops(client, 'tab')).toEqual(['-1', '0'])
	})

	it('табы разметки, активный первым — остановка Tab одна, у сервера и после гидратации', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Tabs, null, () => [
				h(TabsItem, { value: 'a', text: 'A', active: true }),
				h(TabsItem, { value: 'b', text: 'B' }),
			]),
		)

		expect(stops(server, 'tab')).toEqual(['0', '-1'])

		await nextTick()

		expect(warnings).toEqual([])
		expect(stops(client, 'tab')).toEqual(['0', '-1'])
	})
})

describe('Tags · сервер и гидратация', () => {
	it('теги разметки, выбранный вторым: у тега выше вторая остановка Tab — цена сервера, см. «Цена»; гидратация её снимает', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Tags, { mode: 'single' }, () => [
				h(TagsItem, { value: 'a', text: 'A' }),
				h(TagsItem, { value: 'b', text: 'B', selected: true }),
			]),
		)

		expect(stops(server, 'option')).toEqual(['0', '0'])

		await nextTick()

		expect(warnings).toEqual([])
		expect(stops(client, 'option')).toEqual(['-1', '0'])
	})

	it('теги разметки, выбранный первым — остановка Tab одна, у сервера и после гидратации', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Tags, { mode: 'single' }, () => [
				h(TagsItem, { value: 'a', text: 'A', selected: true }),
				h(TagsItem, { value: 'b', text: 'B' }),
			]),
		)

		expect(stops(server, 'option')).toEqual(['0', '-1'])

		await nextTick()

		expect(warnings).toEqual([])
		expect(stops(client, 'option')).toEqual(['0', '-1'])
	})
})
