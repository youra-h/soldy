/**
 * Элемент коллекции отпускает свой контекст — и когда React пересобирает его,
 * не размонтируя.
 *
 * Контекст элемента (`TItemContext`) живёт ровно одно монтирование: его
 * item-адаптеры подписаны на расширения движка. StrictMode и `<Activity>`
 * уничтожают контексты компонента и собирают его заново, а движок, пришедший
 * снаружи (`engine`), это переживает. Контекст, который уничтожение не
 * отпустило, оставался бы на таком движке с каждой пересборкой. Сторож по всем
 * коллекциям — `setup/__tests__/item-context-lifetime.spec.ts`, здесь —
 * настоящий цикл React.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, Suspense, act, use } from 'react'
import { createRoot } from 'react-dom/client'
import { TEvented, TListBox, createEngineListBox } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import { ListBox } from '@soldy-ui/react'

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/** Живые подписки шин движка — драйвера и каждого расширения: повешенные и не снятые. */
function watchSubscriptions(engine: TCollectionEngine<any, any>): () => number {
	const extensions: Readonly<Record<string, { events?: unknown }>> = engine.extensions
	const spies = [
		engine.getCore().driver.events,
		...Object.values(extensions).map((e) => e.events),
	]
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

/** Список над движком снаружи: владелец и движок собраны заранее, слежка — до монтирования. */
async function mountList(strict: boolean) {
	const owner = new TListBox()
	const engine = createEngineListBox({ owner, items: ITEMS })
	const live = watchSubscriptions(engine)
	const container = document.createElement('div')
	const root = createRoot(container)
	const list = <ListBox ctrl={owner} engine={engine} />

	document.body.append(container)

	act(() => root.render(strict ? <StrictMode>{list}</StrictMode> : list))
	// Микрозадачи: набор и движок объявляются на них
	await act(async () => {})

	return {
		live,
		unmount: () => {
			act(() => root.unmount())
			container.remove()
		},
	}
}

describe('движок снаружи', () => {
	it('StrictMode не прибавляет подписок: пересобранный элемент отпустил прежний контекст', async () => {
		const plain = await mountList(false)
		const strict = await mountList(true)

		expect(strict.live()).toBe(plain.live())

		plain.unmount()
		strict.unmount()
	})

	it('после размонтирования подписок на движке не остаётся', async () => {
		const plain = await mountList(false)
		const strict = await mountList(true)

		plain.unmount()
		strict.unmount()

		expect(plain.live()).toBe(0)
		expect(strict.live()).toBe(0)
	})
})

/**
 * Рендер, отброшенный до показа: компонент собран на рендере, а сосед ждёт
 * данных в `Suspense`. Такую сборку React не принимает и не уничтожает —
 * эффектов у неё нет. Подписаться на чужой `ctrl` или движок она не может:
 * снять подписку некому, и каждая отброшенная попытка добавляла бы новые.
 * Ядро здесь ни при чём: подписки ждут принятия (`attach`), а пробросы
 * фасадов — слушателя. Сторож без фреймворка —
 * `setup/__tests__/plugin-unsubscribe.spec.ts` и
 * `setup/__tests__/item-context-lifetime.spec.ts`.
 */
describe('Suspense: сборка, отброшенная до показа', () => {
	/** Живые подписки шин: обработчики `on` без `off` и перехватчики `use` без отписки. */
	function watchBuses(holders: readonly object[]): () => string[] {
		const spies = holders.flatMap((holder) => {
			const bus: unknown = Reflect.get(holder, 'events')

			if (!(bus instanceof TEvented)) return []

			const name = holder.constructor.name
			const on = vi.spyOn(bus, 'on')
			const off = vi.spyOn(bus, 'off')
			const use: { released: boolean }[] = []
			const original = bus.use.bind(bus)

			vi.spyOn(bus, 'use').mockImplementation((middleware) => {
				const entry = { released: false }
				const release = original(middleware)

				use.push(entry)

				return () => {
					entry.released = true
					release()
				}
			})

			return [{ name, on, off, use }]
		})

		return () =>
			spies.flatMap(({ name, on, off, use }) => [
				...on.mock.calls
					.filter(
						([event, handler]) =>
							!off.mock.calls.some(([e, h]) => e === event && h === handler),
					)
					.map(([event]) => `${name}: ${String(event)}`),
				...use.filter(({ released }) => !released).map(() => `${name}: use`),
			])
	}

	/** Ждёт обещания на рендере — так сосед списка ждёт данных. */
	function Wait({ promise }: { promise: Promise<void> }) {
		use(promise)

		return null
	}

	it('после размонтирования на владельце и движке снаружи подписок нет', async () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ITEMS })
		const extensions: Readonly<Record<string, object | undefined>> = engine.extensions
		const live = watchBuses([
			owner,
			engine,
			engine.getCore().driver,
			...Object.values(extensions).filter((extension) => extension !== undefined),
		])
		let resolve: () => void = () => {}
		const promise = new Promise<void>((done) => {
			resolve = done
		})
		const container = document.createElement('div')
		const root = createRoot(container)

		document.body.append(container)

		await act(async () => {
			root.render(
				<Suspense fallback={<p>…</p>}>
					<ListBox ctrl={owner} engine={engine} />
					<Wait promise={promise} />
				</Suspense>,
			)
		})

		await act(async () => {
			resolve()
			await promise
		})

		// Смонтирован по-настоящему: элементы на месте
		expect(container.querySelectorAll('.s-list-box-item')).toHaveLength(ITEMS.length)

		act(() => root.unmount())
		container.remove()

		expect(live()).toEqual([])
	})
})
