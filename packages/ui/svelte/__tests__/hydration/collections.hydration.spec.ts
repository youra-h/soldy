/**
 * Гидратация коллекций разметкой: остановка Tab у табов и тегов.
 *
 * Таб выше активного и тег выше выбранного сервер рисует с остановкой Tab,
 * которую тот держал как первый доступный: вход активного забрал её, когда
 * разметка элемента выше была уже отдана, и до гидратации остановок две
 * (`docs/agents/collections.md`, «Цена»). Браузер собирает элементы в том же
 * порядке: элемент выше гидратация берёт с той же остановкой, что у сервера,
 * а вход активного меняет его набор, и на ближайшем такте после `hydrate()`
 * (`flushSync` в `hydrateServed`) Svelte перерисовывает его атрибуты — уже на
 * узле сервера: остановка одна. Ни расхождение атрибутов с сервером, ни такую
 * перерисовку Svelte не сообщает, поэтому остановку спек сверяет значением, а
 * строки — с узлами сервера (`expectServedNodes`).
 *
 * Разметка сервера — фикстуры из `markup/`, их пишет и сверяет серверный
 * прогон (`markup.server.spec.ts`); страницы — те же. Движок снаружи
 * (`engine`) — только у гидратации: по нему тест читает остановку и меняет
 * коллекцию после гидратации.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { createEngineTabs, createEngineTags } from '@soldy-ui/core'
import TabsActiveFirst from './TabsActiveFirst.test.svelte'
import TabsActiveSecond from './TabsActiveSecond.test.svelte'
import TagsSelectedSecond from './TagsSelectedSecond.test.svelte'
import tabsActiveFirst from './markup/tabs-active-first.html?raw'
import tabsActiveSecond from './markup/tabs-active-second.html?raw'
import tagsSelectedSecond from './markup/tags-selected-second.html?raw'
import { expectServedNodes, hydrateServed, serve } from './serve'

/** Строки с ролью `role` — по порядку. */
const rowsOf = (container: HTMLElement, role: string) => [
	...container.querySelectorAll(`[role="${role}"]`),
]

/** Значение атрибута у каждой строки. */
const attributeOf = (rows: readonly Element[], name: string) =>
	rows.map((row) => row.getAttribute(name))

describe('Tabs · гидратация', () => {
	it('табы разметки, активный вторым: у сервера остановок Tab две, после гидратации — одна, у активного', () => {
		const engine = createEngineTabs()
		const container = serve(tabsActiveSecond)
		const served = rowsOf(container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		hydrateServed(container, TabsActiveSecond, { engine })

		const rows = rowsOf(container, 'tab')

		expectServedNodes(rows, served)
		expect(engine.extensions.tabs.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})

	it('после гидратации узлы сервера живые: активировали первый таб — остановка Tab у него', () => {
		const engine = createEngineTabs()
		const container = serve(tabsActiveSecond)
		const served = rowsOf(container, 'tab')

		hydrateServed(container, TabsActiveSecond, { engine })

		const first = engine.extensions.batch.items.find((item) => item.value === 'a')

		expect(first && engine.extensions.activation.activate(first)).toBe(true)
		flushSync()

		const rows = rowsOf(container, 'tab')

		expectServedNodes(rows, served)
		expect(attributeOf(rows, 'tabindex')).toEqual(['0', '-1'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['true', 'false'])
	})

	it('табы разметки, активный первым — остановка Tab одна, у сервера и после гидратации', () => {
		const engine = createEngineTabs()
		const container = serve(tabsActiveFirst)
		const served = rowsOf(container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '-1'])

		hydrateServed(container, TabsActiveFirst, { engine })

		const rows = rowsOf(container, 'tab')

		expectServedNodes(rows, served)
		expect(engine.extensions.tabs.tabStop?.value).toBe('a')
		expect(attributeOf(rows, 'tabindex')).toEqual(['0', '-1'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['true', 'false'])
	})
})

describe('Tags · гидратация', () => {
	it('теги разметки с выбором, выбран второй: у сервера остановок Tab две, после гидратации — одна, у выбранного', () => {
		const engine = createEngineTags()
		const container = serve(tagsSelectedSecond)
		const served = rowsOf(container, 'option')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		hydrateServed(container, TagsSelectedSecond, { engine })

		const rows = rowsOf(container, 'option')

		expectServedNodes(rows, served)
		expect(engine.extensions.tags.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})
})
