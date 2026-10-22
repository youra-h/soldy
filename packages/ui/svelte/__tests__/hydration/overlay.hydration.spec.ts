/**
 * Панель с `contained` после гидратации: Frame и Popover.
 *
 * С `contained` сервер рисует панель на месте, и `Teleport` адаптера
 * начинает в фазе «на месте»: дети — прямо на месте, без обёртки, как их
 * нарисовал сервер, — и гидратация берёт панель сервера тем же узлом. Svelte
 * не говорит компоненту, гидратация ли это, поэтому на месте начинает любая
 * панель с `contained`; цена — одна пересборка: при первом уходе с места
 * панель собирается в обёртке заново, а дальше ходит тем же узлом (как
 * «гидратация с contained» у React, `ui/react/__tests__/frame.spec.tsx`).
 *
 * Разметку сервера рисует перед прогоном его `globalSetup` (`server.ts`) теми
 * же страницами.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { find, nextFrame } from '../mount'
import { reactiveProps } from '../reactive-props.svelte'
import FrameContained from './FrameContained.test.svelte'
import PopoverContained from './PopoverContained.test.svelte'
import { expectServedNodes, hydrateServed, markupOf, serve } from './serve'

/** Узел Frame — там, где он сейчас, на месте или в `body`. */
const frame = () => find(document, '.so-frame', HTMLElement)

/** Поле в панели — по нему видно, что содержимое не собрано заново. */
const field = (scope: ParentNode) => find(scope, '.so-test-field', HTMLInputElement)

describe('Frame с contained · гидратация', () => {
	it('панель сервера — тем же узлом на месте, с полем сервера', () => {
		const container = serve(markupOf('frame-contained'))
		const served = [...container.querySelectorAll('*')]
		const panel = frame()
		const input = field(panel)

		hydrateServed(container, FrameContained, reactiveProps({ contained: true }))

		expectServedNodes([...container.querySelectorAll('*')], served)
		expect(frame()).toBe(panel)
		expect(panel.parentElement).toBe(container)
		expect(field(panel)).toBe(input)
	})

	it('первый уход с места — новый узел в body, дальше — тот же, с набранным в поле', () => {
		const container = serve(markupOf('frame-contained'))
		const panel = frame()
		const props = reactiveProps({ contained: true })

		hydrateServed(container, FrameContained, props)

		props.contained = false
		flushSync()

		const moved = frame()

		expect(moved).not.toBe(panel)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
		expect(container.contains(moved)).toBe(false)
		expect(document.body.contains(moved)).toBe(true)

		field(moved).value = 'набрано'

		props.contained = true
		flushSync()

		expect(frame()).toBe(moved)
		expect(container.contains(moved)).toBe(true)

		props.contained = false
		flushSync()

		expect(frame()).toBe(moved)
		expect(container.contains(moved)).toBe(false)
		expect(field(moved).value).toBe('набрано')
	})

	/** Номер слоя на сервере не печатается: его открывает узел, кадром после гидратации. */
	it('номер слоя — кадром узла сервера', async () => {
		const container = serve(markupOf('frame-contained'))
		const panel = frame()

		expect(panel.hasAttribute('data-layer')).toBe(false)

		hydrateServed(container, FrameContained, reactiveProps({ contained: true }))
		await nextFrame()

		expect(frame()).toBe(panel)
		expect(panel.getAttribute('data-layer')).not.toBeNull()
		expect(panel.style.zIndex).toBe(panel.getAttribute('data-layer'))
	})
})

describe('Popover с contained · гидратация', () => {
	/** Панель — прямой потомок корня поповера. */
	const panelOf = (scope: ParentNode) =>
		find(scope, '.so-popover > .so-popover__panel[data-contained="true"]', HTMLElement)

	it('разметка поповера — узлы сервера, панель — прямой потомок корня', () => {
		const container = serve(markupOf('popover-contained'))
		const served = [...container.querySelectorAll('*')]
		const panel = panelOf(container)

		hydrateServed(container, PopoverContained, {})

		expectServedNodes([...container.querySelectorAll('*')], served)
		expect(panelOf(container)).toBe(panel)
	})

	/** Панель сервера живая: триггер открывает её на месте, тем же узлом. */
	it('после кадра триггер открывает панель сервера на месте', async () => {
		const container = serve(markupOf('popover-contained'))
		const panel = panelOf(container)

		hydrateServed(container, PopoverContained, {})
		await nextFrame()

		find(container, '.so-test-trigger', HTMLElement).click()
		await nextFrame()

		expect(panelOf(container)).toBe(panel)
		expect(panel.dataset['open']).toBe('true')
		expect(panel.style.display).toBe('')
		expect(find(container, '.so-test-trigger', HTMLElement).getAttribute('aria-controls')).toBe(
			panel.id,
		)
	})
})
