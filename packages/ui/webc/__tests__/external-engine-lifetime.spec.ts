/**
 * Подключения над движком и владельцем снаружи ничего не оставляют на их шинах.
 *
 * Движок и `ctrl`, переданные снаружи, живут дольше подключения. Фасад
 * коллекции подписывается на расширения движка пробросом (`relayAll`), а
 * проброс держит источник, только пока цель слушают (`TEvented`): фасад уходит
 * с движка вместе со своими подписчиками — обменом адаптера. У Web Components
 * связка новая на каждое подключение: элемент, переставленный в документе,
 * собирается заново, и прежняя сборка обязана уйти с движка целиком. Здесь —
 * настоящий цикл Web Components, как `ui/angular/__tests__/external-engine-lifetime.spec.ts`
 * у Angular: набор табов, переставленный трижды и снятый, и на шинах
 * владельца, движка и его расширений ни подписки, ни перехватчика, ни
 * слушателя обмена.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TEvented, TTabs, createEngineTabs } from '@soldy-ui/core'
import { TTabsElement, type TTabsElementProps } from '@soldy-ui/webc'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

function isTabs(node: Element): node is TTabsElementProps {
	return node instanceof TTabsElement
}

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

describe('Tabs над движком и владельцем снаружи', () => {
	it('переставленный трижды и снятый — на шинах владельца и движка ничего', async () => {
		const owner = new TTabs()
		const engine = createEngineTabs({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])
		const el = document.createElement('div', { is: 'so-tabs' })

		if (!isTabs(el)) throw new Error('<div is="so-tabs"> нет')

		el.ctrl = owner
		el.engine = engine
		document.body.appendChild(el)
		await flush()

		// Подписки одной сборки — после первой перестановки: подписки движка на
		// владельца, заведённые до слежки (`createEngineTabs({ owner })`),
		// снимает снятие прежней сборки, а новая заводит их заново
		let mounted: string[] | undefined

		for (let i = 0; i < 3; i++) {
			document.body.appendChild(document.createElement('section')).appendChild(el)
			await flush()

			mounted ??= live().sort()

			// Собран по-настоящему: табы на месте, и сборка одна — прежние ушли
			expect(el.querySelectorAll('.so-tabs-item')).toHaveLength(ITEMS.length)
			expect(live().sort()).toEqual(mounted)
		}

		el.remove()

		expect(live()).toEqual([])
	})
})
