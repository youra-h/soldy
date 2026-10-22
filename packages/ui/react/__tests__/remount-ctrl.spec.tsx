/**
 * Компонент над тем же `ctrl`, перемонтированный в другом месте, не трогает
 * прежний посреди чужого рендера.
 *
 * Смена `key` собирает новый компонент на рендере, пока прежний ещё
 * смонтирован. Плагины связок новой сборки пишут в `ctrl` свои `id`, и
 * прежний слышит эту запись. Сборка над инстансом для остальных его
 * монтирований атомарна (`TAssembling`, setup): их состояние перечитывается
 * после сборки, а не посреди неё. Иначе React получал обновление чужого
 * компонента в фазе рендера — «Cannot update a component while rendering a
 * different component», его роняет сторож консоли, — а в `Suspense` каждый
 * повтор рендера писал в `ctrl` и будил прежний снова, без конца.
 *
 * Сборки, которые `Suspense` выбросил, освобождает `TDrafts`: после снятия на
 * шине `ctrl` не остаётся ничего.
 */

import { describe, it, expect, vi } from 'vitest'
import { Suspense, act, use } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { TPopover, TTabsItem } from '@soldy-ui/core'
import type { TEvented } from '@soldy-ui/core'
import { Popover, Tabs } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

/** Сколько обработчиков, слушателей и перехватчиков держит шина: снятие возвращает к нулю. */
function watchBus(bus: TEvented<any>): () => number {
	let live = 0
	const on = bus.on.bind(bus)
	const off = bus.off.bind(bus)
	const listen = bus.listen.bind(bus)
	const use = bus.use.bind(bus)
	const handlers = new Set<unknown>()
	const release = (undo: () => void) => {
		let done = false

		return () => {
			if (!done) live--
			done = true
			undo()
		}
	}

	vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
		handlers.add(handler)
		on(event, handler)
	})
	vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
		handlers.delete(handler)
		off(event, handler)
	})
	vi.spyOn(bus, 'listen').mockImplementation((listener) => {
		live++

		return release(listen(listener))
	})
	vi.spyOn(bus, 'use').mockImplementation((middleware) => {
		live++

		return release(use(middleware))
	})

	return () => live + handlers.size
}

/** Ждёт обещания на рендере — так сосед в группе `Suspense` ждёт данных. */
function Wait({ promise }: { promise: Promise<void> }) {
	use(promise)

	return null
}

describe('React: перемонтирование над тем же ctrl', () => {
	it('Popover со сменой key: связка — от нового монтирования', async () => {
		const ctrl = new TPopover()
		const view = (key: string) => (
			<div>
				<Popover key={key} ctrl={ctrl}>
					x
				</Popover>
			</div>
		)
		const { render } = mount(view('a'))
		const before = ctrl.triggerAria.get('aria-controls')

		render(view('b'))
		await nextFrame()

		expect(ctrl.triggerAria.get('aria-controls')).not.toBe(before)
		expect(document.querySelectorAll('.so-popover__panel')).toHaveLength(1)
	})

	it('Tabs.Item со сменой key: id в разметке — от нового монтирования', async () => {
		const item = new TTabsItem({ value: 'a', text: 'Первая' })
		const view = (key: string) => (
			<Tabs>
				<Tabs.Item key={key} ctrl={item} />
			</Tabs>
		)
		const { render, container } = mount(view('a'))

		render(view('b'))
		await nextFrame()

		expect(find(container, '[role="tab"]', HTMLElement).id).toBe(item.aria.get('id'))
	})

	it('Suspense: сборки, выброшенные над тем же ctrl, не будят прежний и не остаются на нём', async () => {
		const ctrl = new TPopover()
		const live = watchBus(ctrl.events)
		const container = document.createElement('div')
		const root = createRoot(container)
		let resolve: () => void = () => {}
		const promise = new Promise<void>((done) => {
			resolve = done
		})
		const view = (key: string, wait: ReactNode) => (
			<Suspense fallback={<p>…</p>}>
				<Popover key={key} ctrl={ctrl}>
					x
				</Popover>
				{wait}
			</Suspense>
		)

		document.body.append(container)
		track(root)

		await act(async () => root.render(view('a', null)))

		// Новый поповер в группе с соседом, который ждёт данных: его сборки React
		// выбрасывает, пока данных нет
		await act(async () => root.render(view('b', <Wait promise={promise} />)))
		await act(async () => {
			resolve()
			await promise
		})

		expect(document.querySelectorAll('.so-popover__panel')).toHaveLength(1)

		act(() => root.render(<></>))

		expect(live()).toBe(0)
	})
})
