/**
 * Монтирование над движком и владельцем снаружи ничего не оставляет на их шинах.
 *
 * Движок и `ctrl`, переданные снаружи, живут дольше монтирования. Раньше фасад
 * коллекции подписывался на расширения движка (`relayAll`) в конструкторе и не
 * отписывался никогда: с каждым монтированием на движке прибавлялось по
 * перехватчику на расширение, во всех адаптерах. Теперь проброс держит
 * источник, только пока цель слушают (`TEvented`), и фасад уходит с движка
 * вместе со своими подписчиками — обменом адаптера.
 *
 * Привязка владельца к движку — тоже одно монтирование: перенесённый к другому
 * родителю за одну перерисовку компонент сохраняет владельца, хотя прежнее
 * монтирование снимается уже после того, как принято новое.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { TEvented, TListBox, createEngineListBox } from '@soldy-ui/core'
import { ListBox } from '@soldy-ui/vue'

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

/** Живые подписки шин: `on` без парного `off` и перехватчики `use`, которые не сняли. */
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
		const original = bus.use.bind(bus)

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
			const release = original(middleware)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
	}

	return () => [...live.keys()].map((key) => key.replace(/#\d+$/, ''))
}

describe('ListBox над движком и владельцем снаружи', () => {
	it('после нескольких монтирований на шинах владельца и движка ничего', async () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])

		for (let i = 0; i < 3; i++) {
			const wrapper = mount(ListBox, {
				props: { ctrl: owner, engine },
				attachTo: document.body,
			})

			await nextTick()

			// Смонтирован по-настоящему: элементы на месте
			expect(wrapper.findAll('.so-list-box-item')).toHaveLength(ITEMS.length)

			wrapper.unmount()
		}

		expect(live()).toEqual([])
	})

	/**
	 * Перенос к другому родителю за одну перерисовку — ветки `v-if`/`v-else` с
	 * разными обёртками. Новый ListBox Vue монтирует раньше, чем снимает
	 * прежний: `setup()` нового принимает компонент и привязывает владельца, а
	 * `onUnmounted` прежнего идёт после прохода перерисовки. Привязку снимает
	 * только её держатель — фасад последнего монтирования.
	 */
	it('перенос между родителями за одну перерисовку: владелец на месте, после снятия на шинах ничего', async () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const first = ref(true)
		const Host = defineComponent({
			components: { ListBox },
			setup: () => ({ first, owner, engine }),
			template: `
				<div v-if="first" class="so-test-first"><ListBox :ctrl="owner" :engine="engine" /></div>
				<section v-else class="so-test-second"><ListBox :ctrl="owner" :engine="engine" /></section>
			`,
		})
		const disabled = () =>
			[...document.querySelectorAll('.so-list-box-item')].map((item) =>
				item.getAttribute('data-disabled'),
			)
		const wrapper = mount(Host, { attachTo: document.body })

		await nextTick()

		expect(engine.options.get('owner')).toBe(owner)

		first.value = false
		await nextTick()

		// Перенесён: прежний снят, новый — в другой обёртке
		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(document.querySelectorAll('.so-test-second .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(engine.options.get('owner')).toBe(owner)

		// Подписки на владельца живы: его `disabled` доходит до элементов
		owner.disabled = true
		await nextTick()

		expect(disabled()).toEqual(['true', 'true'])

		wrapper.unmount()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})
})
