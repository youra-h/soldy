/**
 * Поздняя гидратация: окна гидратации после основного и наборы, сменившиеся
 * в них.
 *
 * Содержимое границы `Suspense`, которая ждёт данных, сервер отдаёт после
 * оболочки (`renderToStream`), и браузер гидратирует его, когда данные
 * пришли, — позже основной гидратации, вернув на это время контекст
 * гидратации. Остров браузер гидратирует своим `hydrate()`. В таком окне Solid
 * тоже не пишет в узлы, а спред запоминает пропущенное как записанное.
 * Элемент, вошедший в коллекцию за границей, меняет наборы узлов, которые
 * гидратировала основная гидратация: остановку Tab забирает у таба выше,
 * `for` подписи Field переводит на свой `id`. Поэтому мемо раскладки держит
 * то, что в узле, в любом окне гидратации, а после окна отдаёт живое
 * (`src/adapter/common/root.ts`, шапка, «Гидратация»).
 *
 * Поток сервера и острова рисует перед прогоном его `globalSetup`
 * (`server.tsx`); страницы — те же (`pages.tsx`). Поток в документ кладёт,
 * досылает и разрешает `serveStreamed` из `serve.ts`.
 */

import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { createEngineTabs, createEngineTags } from '@soldy-ui/core'
import {
	FieldControlStreamed,
	IslandEntry,
	IslandProbe,
	RootProbeStreamed,
	TabsActiveStreamed,
	TabsStreamed,
	TagsSelectedStreamed,
} from './pages'
import { expectServedNodes, hydrateServed, markupOf, serve, serveStreamed } from './serve'

/** Строки с ролью `role` — по порядку. */
const rowsOf = (container: HTMLElement, role: string) => [
	...container.querySelectorAll(`[role="${role}"]`),
]

/** Значение атрибута у каждой строки. */
const attributeOf = (rows: readonly Element[], name: string) =>
	rows.map((row) => row.getAttribute(name))

describe('Tabs · поздняя гидратация', () => {
	it('табы целиком за границей Suspense: после её гидратации остановка Tab одна, у активного', async () => {
		const engine = createEngineTabs()
		const streamed = serveStreamed(markupOf('tabs-streamed'))

		hydrateServed(streamed.container, () => <TabsStreamed engine={engine} />, streamed.options)

		expect(rowsOf(streamed.container, 'tab')).toEqual([])

		streamed.deliver()

		const served = rowsOf(streamed.container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		await streamed.resolve()

		const rows = rowsOf(streamed.container, 'tab')

		expectServedNodes(rows, served)
		expect(engine.extensions.tabs.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})

	it('активный за границей Suspense: таб выше гидратирован раньше, после поздней гидратации остановка Tab одна', async () => {
		const engine = createEngineTabs()
		const streamed = serveStreamed(markupOf('tabs-active-streamed'))

		hydrateServed(
			streamed.container,
			() => <TabsActiveStreamed engine={engine} />,
			streamed.options,
		)

		expect(attributeOf(rowsOf(streamed.container, 'tab'), 'tabindex')).toEqual(['0'])

		streamed.deliver()

		const served = rowsOf(streamed.container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		await streamed.resolve()

		const rows = rowsOf(streamed.container, 'tab')

		expectServedNodes(rows, served)
		expect(engine.extensions.tabs.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})

	it('после поздней гидратации раскладка живая: активировали первый таб — остановка Tab у него', async () => {
		const engine = createEngineTabs()
		const streamed = serveStreamed(markupOf('tabs-active-streamed'))

		hydrateServed(
			streamed.container,
			() => <TabsActiveStreamed engine={engine} />,
			streamed.options,
		)
		streamed.deliver()
		await streamed.resolve()

		const first = engine.extensions.batch.items.find((item) => item.value === 'a')

		expect(first && engine.extensions.activation.activate(first)).toBe(true)
		expect(attributeOf(rowsOf(streamed.container, 'tab'), 'tabindex')).toEqual(['0', '-1'])
	})
})

describe('Tags · поздняя гидратация', () => {
	it('выбранный за границей Suspense: тег выше гидратирован раньше, после поздней гидратации остановка Tab одна', async () => {
		const engine = createEngineTags()
		const streamed = serveStreamed(markupOf('tags-selected-streamed'))

		hydrateServed(
			streamed.container,
			() => <TagsSelectedStreamed engine={engine} />,
			streamed.options,
		)
		streamed.deliver()

		const served = rowsOf(streamed.container, 'option')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		await streamed.resolve()

		const rows = rowsOf(streamed.container, 'option')

		expectServedNodes(rows, served)
		expect(engine.extensions.tags.tabStop?.value).toBe('b')
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
	})
})

describe('Field · поздняя гидратация', () => {
	it('контрол со своим id за границей Suspense: for подписи после поздней гидратации — на него', async () => {
		const streamed = serveStreamed(markupOf('field-control-streamed'))
		const label = streamed.container.querySelector('label')

		hydrateServed(streamed.container, () => <FieldControlStreamed />, streamed.options)
		streamed.deliver()

		const input = streamed.container.querySelector('input')

		expect(input?.id).toBe('email')
		expect(label?.getAttribute('for')).not.toBe('email')

		await streamed.resolve()

		expect(streamed.container.querySelector('label')).toBe(label)
		expect(streamed.container.querySelector('input')).toBe(input)
		expect(label?.getAttribute('for')).toBe('email')
	})
})

/**
 * Мемо, собранное в одном окне гидратации, а сменившееся в другом: Solid
 * запись в узел пропустил бы, а спред запомнил бы её как сделанную. Мемо
 * держит прежнее в любом окне — и уже отдававшее живое, и не пересчитанное с
 * окна, где собрано.
 */
describe('раскладка корня · поздняя гидратация', () => {
	it('набор, сменившийся и в основной гидратации, и в поздней: в узле — последний', async () => {
		const streamed = serveStreamed(markupOf('root-probe-streamed'))
		const root = streamed.container.querySelector('[data-probe]')

		expect(root?.getAttribute('data-probe')).toBe('served')

		hydrateServed(streamed.container, () => <RootProbeStreamed />, streamed.options)

		expect(root?.getAttribute('data-probe')).toBe('main')

		streamed.deliver()
		await streamed.resolve()

		expect(streamed.container.querySelector('[data-probe]')).toBe(root)
		expect(root?.getAttribute('data-probe')).toBe('late')
	})

	it('набор корня острова сменил вход в другом острове, пока тот гидратировался: в узле — новый', () => {
		const [mark, setMark] = createSignal('served')
		const first = serve(markupOf('island-probe'))
		const second = serve(markupOf('island-entry'))
		const root = first.querySelector('[data-probe]')

		hydrateServed(first, () => <IslandProbe mark={mark} />, { renderId: 'a' })

		expect(root?.getAttribute('data-probe')).toBe('served')

		hydrateServed(second, () => <IslandEntry enter={() => setMark('island')} />, {
			renderId: 'b',
		})

		expect(first.querySelector('[data-probe]')).toBe(root)
		expect(root?.getAttribute('data-probe')).toBe('island')
	})
})
