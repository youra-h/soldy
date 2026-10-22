/**
 * Гидратация коллекций разметкой: остановка Tab у табов и тегов — и что
 * дописывать после гидратации приходится только поменянным ею корням.
 *
 * Таб выше активного и тег выше выбранного сервер рисует с остановкой Tab,
 * которую тот держал как первый доступный: вход активного забрал её, когда
 * разметка элемента выше была уже отдана, и до гидратации остановок две
 * (`docs/agents/collections.md`, «Цена»). Браузер собирает элементы в том же
 * порядке, и вход активного снимает лишнюю остановку ещё во время гидратации.
 * Пока Solid гидратирует, в узлы он не пишет — считает их совпавшими с
 * разметкой сервера, — поэтому раскладка корня отдаёт напечатанное сервером,
 * пока гидратация не кончилась, а сменившееся за неё спред дописывает в узел
 * после (`src/adapter/common/root.ts`, шапка).
 *
 * Разметка сервера — фикстура из `markup/`: её пишет и сверяет серверный
 * прогон (`markup.server.spec.tsx`), а страница — та же (`pages.tsx`), только
 * собрана для браузера с метками гидратации. Контейнер стоит в документе:
 * узел вне документа Solid гидратацией не считает и пишет в него сам — спек
 * был бы зелёным и без раскладки корня.
 */

import { describe, it, expect, afterEach } from 'vitest'
import type { JSX } from 'solid-js'
import { hydrate } from 'solid-js/web'
import { createEngineTabs, createEngineTags } from '@soldy-ui/core'
import { RootProbe, TabsActiveFirst, TabsActiveSecond, TagsSelectedSecond } from './pages'
import rootProbe from './markup/root-probe.html?raw'
import tabsActiveFirst from './markup/tabs-active-first.html?raw'
import tabsActiveSecond from './markup/tabs-active-second.html?raw'
import tagsSelectedSecond from './markup/tags-selected-second.html?raw'

const disposers: Array<() => void> = []

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) dispose()

	document.body.innerHTML = ''
})

/** Разметка сервера в документе — как её получает браузер. */
function serve(markup: string): HTMLElement {
	const container = document.createElement('div')

	container.innerHTML = markup
	document.body.append(container)

	return container
}

/**
 * Гидратировать разметку сервера в `container` страницей `page`. Состояние
 * гидратации `_$HY` в страницу кладёт скрипт сервера приложения
 * (`generateHydrationScript`) — здесь его кладёт тест.
 */
function hydrateServed(container: HTMLElement, page: () => JSX.Element): void {
	Object.assign(globalThis, { _$HY: { events: [], completed: new WeakSet(), r: {}, fe() {} } })
	disposers.push(hydrate(page, container))
}

/** Строки с ролью `role` — по порядку. */
const rowsOf = (container: HTMLElement, role: string) => [
	...container.querySelectorAll(`[role="${role}"]`),
]

/** Значение атрибута у каждой строки. */
const attributeOf = (rows: readonly Element[], name: string) =>
	rows.map((row) => row.getAttribute(name))

/** Строки после гидратации — те же узлы, что прислал сервер. */
function expectServedNodes(rows: readonly Element[], served: readonly Element[]): void {
	expect(rows).toHaveLength(served.length)
	rows.forEach((row, index) => expect(row).toBe(served[index]))
}

describe('Tabs · гидратация', () => {
	it('табы разметки, активный вторым: у сервера остановок Tab две, после гидратации — одна, у активного', () => {
		const engine = createEngineTabs()
		const container = serve(tabsActiveSecond)
		const served = rowsOf(container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		hydrateServed(container, () => <TabsActiveSecond engine={engine} />)

		const rows = rowsOf(container, 'tab')

		expectServedNodes(rows, served)
		expect(engine.extensions.tabs.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})

	/**
	 * Активирует движок, а не клик: первое делегированное событие Solid
	 * считает концом гидратации навсегда (`sharedConfig.done`), и следующие
	 * тесты файла рисовали бы страницу заново, а не гидратировали её.
	 */
	it('после гидратации раскладка живая: активировали первый таб — остановка Tab у него', () => {
		const engine = createEngineTabs()
		const container = serve(tabsActiveSecond)

		hydrateServed(container, () => <TabsActiveSecond engine={engine} />)

		const first = engine.extensions.batch.items.find((item) => item.value === 'a')

		expect(first && engine.extensions.activation.activate(first)).toBe(true)
		expect(attributeOf(rowsOf(container, 'tab'), 'tabindex')).toEqual(['0', '-1'])
		expect(attributeOf(rowsOf(container, 'tab'), 'aria-selected')).toEqual(['true', 'false'])
	})

	it('табы разметки, активный первым — остановка Tab одна, у сервера и после гидратации', () => {
		const engine = createEngineTabs()
		const container = serve(tabsActiveFirst)
		const served = rowsOf(container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '-1'])

		hydrateServed(container, () => <TabsActiveFirst engine={engine} />)

		const rows = rowsOf(container, 'tab')

		expectServedNodes(rows, served)
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

		hydrateServed(container, () => <TagsSelectedSecond engine={engine} />)

		const rows = rowsOf(container, 'option')

		expectServedNodes(rows, served)
		expect(engine.extensions.tags.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})
})

/**
 * Дописывать после гидратации есть что только корням, которые она поменяла:
 * мемо раскладки, не пересчитанное за гидратацию, держит живое значение, и
 * второй проход спреда по всем корням страницы был бы лишней работой.
 */
describe('раскладка корня · гидратация', () => {
	it('корень, который гидратация не меняла, второго прохода не делает', () => {
		let computed = 0
		const container = serve(rootProbe)
		const served = [...container.children]

		hydrateServed(container, () => <RootProbe onCompute={() => computed++} />)

		expectServedNodes([...container.children], served)
		expect(computed).toBe(1)
	})
})
