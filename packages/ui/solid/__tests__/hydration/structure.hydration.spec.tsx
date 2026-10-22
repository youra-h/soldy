/**
 * Структура компонента — ветки и петли — и окна гидратации.
 *
 * Пока открыто окно гидратации, Solid структуру не меняет: новый узел ищет по
 * ключу текущего окна, а под ним у сервера чужой узел или никакого (`Hydration
 * Mismatch`), снятие же узла у подключённого родителя пропускает. Ветка или
 * петля, пересчитанная в окне, поэтому держит прежнее и меняется после окна:
 * примитивы адаптера `Show`, `For`, `Index` (`src/adapter/runtime/flow.ts`) и
 * `KeyedFor`. Первое значение у них живое: структура после детей читает то,
 * что видел сервер (`list-box.hydration.spec.tsx`).
 *
 * Окно бывает поздним: содержимое границы `Suspense`, которое сервер дослал
 * потоком, браузер гидратирует, когда пришли её данные. Вход элемента за
 * границей меняет структуру вне её — панель таба, слот пустого списка, тосты
 * в регионе, который браузер нарисовал сам. И основным: вход соседа меняет
 * источник структуры, которую браузер уже собрал до него.
 *
 * Разметку сервера и поток рисует перед прогоном его `globalSetup`
 * (`server.tsx`); страницы — те же (`pages.tsx`). Поток в документ кладёт,
 * досылает и разрешает `serveStreamed` из `serve.ts`.
 */

import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { createEngineListBox, createEngineTabs } from '@soldy-ui/core'
import {
	ListBoxEmptyStreamed,
	StructureProbe,
	TabsContentStreamed,
	ToastsBodyStreamed,
} from './pages'
import { expectServedNodes, hydrateServed, markupOf, serve, serveStreamed } from './serve'

/** Строки с ролью `role` — по порядку. */
const rowsOf = (scope: ParentNode, role: string) => [...scope.querySelectorAll(`[role="${role}"]`)]

/** Значение атрибута у каждой строки. */
const attributeOf = (rows: readonly Element[], name: string) =>
	rows.map((row) => row.getAttribute(name))

describe('Tabs · структура в позднем окне', () => {
	it('панель вне границы Suspense, её таб за ней: после поздней гидратации панель в документе, остановка Tab одна', async () => {
		const engine = createEngineTabs()
		const streamed = serveStreamed(markupOf('tabs-content-streamed'))

		hydrateServed(
			streamed.container,
			() => <TabsContentStreamed engine={engine} />,
			streamed.options,
		)

		expect(rowsOf(streamed.container, 'tabpanel')).toEqual([])

		streamed.deliver()

		const served = rowsOf(streamed.container, 'tab')

		expect(attributeOf(served, 'tabindex')).toEqual(['0', '0'])

		await streamed.resolve()

		const rows = rowsOf(streamed.container, 'tab')
		const panels = rowsOf(streamed.container, 'tabpanel')

		expectServedNodes(rows, served)
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '0'])
		expect(panels.map((panel) => panel.textContent)).toEqual(['Панель B'])
		expect(panels[0]?.getAttribute('aria-labelledby')).toBe(rows[1]?.id)
	})
})

describe('ListBox · структура в позднем окне', () => {
	it('слот пустого списка вне границы Suspense, элемент за ней: после поздней гидратации слота нет', async () => {
		const engine = createEngineListBox()
		const streamed = serveStreamed(markupOf('list-box-empty-streamed'))

		hydrateServed(
			streamed.container,
			() => <ListBoxEmptyStreamed engine={engine} />,
			streamed.options,
		)

		expect(streamed.container.querySelector('.empty')?.textContent).toBe('Пусто')

		streamed.deliver()

		const served = rowsOf(streamed.container, 'option')

		expect(served).toHaveLength(1)

		await streamed.resolve()

		expectServedNodes(rowsOf(streamed.container, 'option'), served)
		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual(['a'])
		expect(streamed.container.querySelector('.empty')).toBeNull()
	})

	it('после поздней гидратации структура живая: приложение сняло элемент — слот пустого списка вернулся', async () => {
		const engine = createEngineListBox()
		const [present, setPresent] = createSignal(true)
		const streamed = serveStreamed(markupOf('list-box-empty-streamed'))

		hydrateServed(
			streamed.container,
			() => <ListBoxEmptyStreamed engine={engine} present={present} />,
			streamed.options,
		)
		streamed.deliver()
		await streamed.resolve()

		expect(streamed.container.querySelector('.empty')).toBeNull()

		setPresent(false)

		expect(engine.extensions.batch.items).toEqual([])
		expect(rowsOf(streamed.container, 'option')).toEqual([])
		expect(streamed.container.querySelector('.empty')?.textContent).toBe('Пусто')
	})
})

describe('Toasts · структура в позднем окне', () => {
	it('тост, показанный из тела компонента за границей Suspense: после поздней гидратации он в регионе', async () => {
		const streamed = serveStreamed(markupOf('toasts-body-streamed'))

		hydrateServed(streamed.container, () => <ToastsBodyStreamed />, streamed.options)

		// Регион браузер нарисовал сам, после основного окна: сервер его не печатает
		const region = document.querySelector('.so-toasts')

		expect(region).not.toBeNull()
		expect(streamed.container.contains(region)).toBe(false)
		expect(document.querySelectorAll('.so-toasts-item')).toHaveLength(0)

		streamed.deliver()
		await streamed.resolve()

		const toasts = [...document.querySelectorAll('.so-toasts-item')]

		expect(document.querySelector('.so-toasts')).toBe(region)
		expect(
			toasts.map((toast) => toast.querySelector('.so-toasts-item__text')?.textContent),
		).toEqual(['Сохранено'])
	})
})

describe('структура · основное окно', () => {
	it('Show, For, Index и KeyedFor, чей источник после них сменил сосед: после гидратации — сменившаяся структура', () => {
		const container = serve(markupOf('structure-probe'))
		const root = container.firstElementChild
		const entry = container.querySelector('i')

		expect(container.querySelectorAll('b')).toHaveLength(0)

		hydrateServed(container, () => <StructureProbe />)

		expect(container.firstElementChild).toBe(root)
		expect(container.querySelector('i')).toBe(entry)
		expect([...container.querySelectorAll('b')].map((node) => node.className)).toEqual([
			'show',
			'for',
			'index',
			'keyed',
		])
		expect([...container.querySelectorAll('b')].map((node) => node.textContent)).toEqual([
			'entered',
			'entered',
			'entered',
			'entered',
		])
	})
})
