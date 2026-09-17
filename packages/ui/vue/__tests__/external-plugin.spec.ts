/**
 * Плагин и расширение коллекции, поставленные снаружи одному компоненту.
 *
 * Своей логики компоненту добавляют без правки библиотеки: плагин — в
 * `@bundle:create`, расширение движка — в `@engine:create`. Плагин живёт по
 * циклу набора: объявляется вместе с плагинами компонента и уничтожается при
 * размонтировании.
 *
 * Пример — таймер на кнопке: работает только при варианте темы, который он
 * понимает (`brand` из фикстуры), нажатие запускает и останавливает отсчёт.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { TButton } from '@soldy/core'
import { TActionPlugin, TBasePlugin, TPluginBundle } from '@soldy/plugins'
import type { IPluginContext } from '@soldy/plugins'
import type { IExtension, IExtensionContext } from '@soldy/core'
import { TCollectionEngine, TEvented } from '@soldy/core'
import { Button, ListBox } from '@soldy/ui-vue'

/** Слушатели нажатия появляются по `element:ready`, а он приходит через кадр. */
const mounted = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

class TTimerPlugin extends TBasePlugin<TButton> {
	ticks = 0

	private _timer: ReturnType<typeof setInterval> | null = null

	get running(): boolean {
		return this._timer !== null
	}

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const button = ctx.getInstance<TButton>()

		ctx.get(TActionPlugin)?.events.on('press', () => {
			if (button?.variant !== 'brand') return

			if (this.running) this._stop()
			else this._timer = setInterval(() => this.ticks++, 1000)
		})
	}

	override destroy(): void {
		this._stop()

		super.destroy()
	}

	private _stop(): void {
		if (this._timer !== null) clearInterval(this._timer)

		this._timer = null
	}
}

/** Монтирует кнопку и ставит ей таймер из `@bundle:create`. */
const mountTimer = async (props: Record<string, unknown> = {}) => {
	const received: { timer?: TTimerPlugin } = {}

	const wrapper = mount(Button, {
		props: {
			...props,
			'onBundle:create': (bundle: unknown) => {
				if (!(bundle instanceof TPluginBundle)) return

				bundle.use(TTimerPlugin)
				received.timer = bundle.get(TTimerPlugin)
			},
		},
	})

	await mounted()

	if (!received.timer) throw new Error('таймер не поставлен')

	return { wrapper, timer: received.timer }
}

afterEach(() => {
	vi.useRealTimers()
})

describe('плагин снаружи · таймер на кнопке', () => {
	it('нажатие запускает и останавливает отсчёт', async () => {
		const { wrapper, timer } = await mountTimer({ variant: 'brand' })

		// После монтирования: кадр в jsdom идёт на таймерах, поддельные его остановили бы
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })

		await wrapper.trigger('click')
		vi.advanceTimersByTime(3000)

		expect(timer.ticks).toBe(3)

		await wrapper.trigger('click')
		vi.advanceTimersByTime(3000)

		expect(timer.ticks).toBe(3)
		expect(timer.running).toBe(false)

		wrapper.unmount()
	})

	it('без своего варианта кнопка остаётся обычной', async () => {
		const { wrapper, timer } = await mountTimer()

		await wrapper.trigger('click')

		expect(timer.running).toBe(false)

		wrapper.unmount()
	})

	it('размонтирование уничтожает плагин: отсчёт останавливается', async () => {
		const { wrapper, timer } = await mountTimer({ variant: 'brand' })

		// После монтирования: кадр в jsdom идёт на таймерах, поддельные его остановили бы
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })

		await wrapper.trigger('click')

		expect(timer.running).toBe(true)

		wrapper.unmount()

		expect(timer.running).toBe(false)
		expect(vi.getTimerCount()).toBe(0)
	})
})

/** Расширение снаружи: считает элементы движка на момент установки. */
class TProbeExtension<T> implements IExtension<T> {
	readonly name = 'probe'
	readonly events = new TEvented<Record<string, never>>()

	count = -1

	install(ctx: IExtensionContext<T>): void {
		this.count = ctx.driver.valueOf().length
	}
}

describe('расширение снаружи · через engine:create', () => {
	it('ставится в движок компонента и видит его состав', async () => {
		const probe = new TProbeExtension<object>()
		const received: { engine?: TCollectionEngine<object> } = {}

		const wrapper = mount(ListBox, {
			props: {
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
				],
				'onEngine:create': (engine: unknown) => {
					if (!(engine instanceof TCollectionEngine)) return

					engine.use(probe)
					received.engine = engine
				},
			},
		})

		await nextTick()

		expect(received.engine?.extensions.probe).toBe(probe)
		expect(probe.count).toBe(2)

		wrapper.unmount()
	})
})
