/**
 * Элемент коллекции отпускает свой контекст при размонтировании.
 *
 * Фильтр прячет элемент из данных — компонент элемента размонтируется, а сам
 * элемент остаётся в коллекции; фильтр сняли — элемент монтируется снова.
 * Контекст элемента (`TItemContext`) живёт ровно одно монтирование: его
 * item-адаптеры подписаны на расширения движка, и контекст, который
 * размонтирование не отпустило, копил бы на движке подписчиков с каждым
 * показом. Сторож по всем коллекциям — `setup/__tests__/item-context-lifetime.spec.ts`,
 * здесь — настоящий цикл монтирования Vue.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TEvented, createEngine } from '@soldy-ui/core'
import { Accordion, ListBox, Tabs, Tags } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/**
 * Живые подписки шин движка — драйвера и каждого расширения: повешенные после
 * начала слежки и не снятые.
 */
function watchSubscriptions(buses: readonly unknown[]): () => number {
	const spies = buses
		.filter((bus) => bus instanceof TEvented)
		.map((bus) => ({ on: vi.spyOn(bus, 'on'), off: vi.spyOn(bus, 'off') }))

	return () =>
		spies.reduce(
			(live, { on, off }) =>
				live +
				on.mock.calls.filter(
					([event, handler]) =>
						!off.mock.calls.some(([e, h]) => e === event && h === handler),
				).length,
			0,
		)
}

describe.each([
	['ListBox', ListBox],
	['Tabs', Tabs],
	['Accordion', Accordion],
	['Tags', Tags],
] as const)('%s: фильтр прячет и показывает элемент', (_name, Component) => {
	it('подписок на движке не прибавляется с каждым показом', async () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const { driver } = engine.getCore()
		let hidden = false

		// Отбор без расширения фильтра — тот же механизм, что у `TFilterExtension`
		driver.events.on('items:query:before', (e) => {
			if (hidden) e.items = e.items.filter((item) => item.value !== 'b')
		})

		wrapper = mount(Component, { props: { engine }, attachTo: document.body })
		await nextTick()

		const live = watchSubscriptions([
			driver.events,
			...Object.values(engine.extensions).map((extension) => extension?.events),
		])

		const cycle = async () => {
			hidden = true
			driver.invalidateQuery()
			await nextTick()

			hidden = false
			driver.invalidateQuery()
			await nextTick()
		}

		await cycle()

		const afterFirst = live()

		await cycle()
		await cycle()

		expect(engine.extensions.batch.items).toHaveLength(2)
		expect(live()).toBe(afterFirst)
	})
})
