/**
 * Список над движком снаружи без `ctrl`, перенесённый за одну перерисовку.
 *
 * Без `ctrl` каждое монтирование собирает своего владельца, а движок снаружи
 * тот же. Ветки `{#if}`/`{:else}` Svelte меняет так: собирает новую и только
 * потом ставит на паузу прежнюю — снимает её сразу или, с `out:`, когда
 * кончится уход. Привязку владельца забирает новое монтирование, хотя прежнее
 * ещё держит движок, а снятие прежнего её не трогает. Прерванный уход
 * возобновляет прежнюю ветку без новой сборки и снимает новую: привязка
 * возвращается к прежней. Как `ui/vue/__tests__/external-engine-lifetime.spec.ts`
 * у Vue — на ListBox, и после снятия на шинах движка ничего.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushSync, type ComponentProps } from 'svelte'
import { TEvented, TListBox, createEngineListBox } from '@soldy-ui/core'
import type { TListBoxCollection } from '@soldy-ui/core'
import EngineMove from './EngineMove.test.svelte'
import { mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

type THarnessProps = ComponentProps<typeof EngineMove>

afterEach(() => {
	vi.restoreAllMocks()
	Reflect.deleteProperty(Element.prototype, 'animate')
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/**
 * Живые подписки шин: `on` без парного `off`, перехватчики `use` и слушатели
 * `listen`, которых не сняли.
 */
function watchBuses(buses: readonly TEvented<any>[]): () => string[] {
	const live = new Map<string, number>()
	const keys = new Map<unknown, Map<string, string>>()
	let next = 0
	const keyOf = (handler: unknown, event: string): string => {
		const byEvent = keys.get(handler) ?? new Map<string, string>()
		const key = byEvent.get(event) ?? `${event}#${next++}`

		byEvent.set(event, key)
		keys.set(handler, byEvent)

		return key
	}
	const count = (key: string, delta: number) => {
		const value = (live.get(key) ?? 0) + delta

		if (value > 0) live.set(key, value)
		else live.delete(key)
	}

	for (const bus of buses) {
		const on = bus.on.bind(bus)
		const off = bus.off.bind(bus)
		const use = bus.use.bind(bus)
		const listen = bus.listen.bind(bus)

		vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
			count(keyOf(handler, String(event)), 1)
			on(event, handler)
		})
		vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
			count(keyOf(handler, String(event)), -1)
			off(event, handler)
		})
		vi.spyOn(bus, 'use').mockImplementation((middleware) => {
			const key = `use#${next++}`
			const release = use(middleware)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
		vi.spyOn(bus, 'listen').mockImplementation((listener) => {
			const key = `listen#${next++}`
			const release = listen(listener)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
	}

	return () => [...live.keys()].map((key) => key.replace(/#\d+$/, ''))
}

/** Шины движка: сам движок и каждое расширение. */
function engineBuses(engine: TListBoxCollection): TEvented<any>[] {
	return [
		engine.events,
		...Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		),
	]
}

/** Владелец в опциях движка: без `ctrl` его собирает монтирование. */
function ownerOf(engine: TListBoxCollection): TListBox {
	const owner = engine.options.get('owner')

	if (!(owner instanceof TListBox)) throw new Error('владельца у движка нет')

	return owner
}

/** `data-disabled` элементов списка в документе. */
function itemsDisabled(): (string | null)[] {
	return [...document.querySelectorAll('.so-list-box-item')].map((item) =>
		item.getAttribute('data-disabled'),
	)
}

/**
 * Уход, который не кончается сам: анимацию Svelte заводит через
 * `Element.animate`, а jsdom её не реализует. Анимация из заглушки не
 * завершается никогда — ветка уходит, пока Svelte уход не прервёт.
 */
function holdAnimations(): void {
	Object.defineProperty(Element.prototype, 'animate', {
		configurable: true,
		value: () => ({
			onfinish: null,
			effect: null,
			playState: 'running',
			currentTime: 0,
			cancel: () => {},
		}),
	})
}

describe('ListBox над движком снаружи без ctrl, перенесённый за одну перерисовку', () => {
	it('перенос между ветками {#if}: движок у владельца нового монтирования, после снятия на шинах ничего', () => {
		const engine = createEngineListBox({ items: ITEMS })
		const live = watchBuses(engineBuses(engine))
		const props = reactiveProps<THarnessProps>({ engine, swapped: false })
		const { destroy } = mount(EngineMove, props)
		const first = ownerOf(engine)

		props.swapped = true
		flushSync()

		// Перенесён: элементы одного списка, движок — у нового владельца
		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(document.querySelectorAll('.so-test-second .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(ownerOf(engine)).not.toBe(first)

		// Прежний владелец отпущен: его `disabled` до элементов не доходит
		first.disabled = true
		flushSync()

		expect(itemsDisabled()).not.toContain('true')

		// Подписки на нового живы: его `disabled` доходит до элементов
		props.disabled = true
		flushSync()

		expect(itemsDisabled()).toEqual(['true', 'true'])

		destroy()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})

	/**
	 * Уход прежней ветки прерван: Svelte возобновляет её без новой сборки и
	 * снимает новую. Снятие нового монтирования отдаёт привязку прежнему — оно
	 * живо и снова на экране.
	 */
	it('прерванный уход: прежняя ветка возобновлена, привязка вернулась к её владельцу', () => {
		holdAnimations()

		const engine = createEngineListBox({ items: ITEMS })
		const live = watchBuses(engineBuses(engine))
		const props = reactiveProps<THarnessProps>({ engine, swapped: false, outro: 1000 })
		const { destroy } = mount(EngineMove, props)
		const first = ownerOf(engine)

		props.swapped = true
		flushSync()

		// Прежняя ветка уходит и жива, движок — у новой
		expect(document.querySelectorAll('.so-test-first .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(document.querySelectorAll('.so-test-second .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(ownerOf(engine)).not.toBe(first)

		props.swapped = false
		flushSync()

		// Уход прерван: прежняя ветка на месте, новая снята, привязка — у прежней
		expect(document.querySelector('.so-test-second')).toBeNull()
		expect(document.querySelectorAll('.so-test-first .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(ownerOf(engine)).toBe(first)

		// Подписки на прежнего живы: его `disabled` доходит до элементов
		props.disabled = true
		flushSync()

		expect(itemsDisabled()).toEqual(['true', 'true'])

		destroy()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})
})
