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
 *
 * Плагин на тип (`usePlugins`) по умолчанию ставится только компонентам
 * пользователя: строку и крестик тега разметка помечает `embedded`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TActionPlugin, TBasePlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { IPluginContext, TPluginEvents } from '@soldy-ui/plugins'
import type { IExtension, IExtensionContext } from '@soldy-ui/core'
import { TButton, TCollectionEngine, TEvented, TTags } from '@soldy-ui/core'
import { definePlugin, useExtensions, usePlugins } from '@soldy-ui/setup'
import { Button, ListBox, Select, SelectItem, Tags, TagsItem } from '@soldy-ui/vue'

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

/** Плагин реестра: запоминает кнопки, которым поставлен. */
const installedOn: TButton[] = []

class TMarkPlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)
		const button = ctx.getInstance()

		if (button instanceof TButton) installedOn.push(button)
	}
}

describe('плагин на тип · usePlugins', () => {
	let dispose: (() => void) | null = null

	afterEach(() => {
		dispose?.()
		dispose = null
		installedOn.length = 0
	})

	/** Кнопка пользователя рядом с закрываемым тегом: у тега строка и крестик — тоже Button. */
	const render = () =>
		mount({
			components: { Button, Tags, TagsItem },
			template: `
				<div>
					<Button text="Своя" />
					<Tags closable><TagsItem value="a" text="A" /></Tags>
				</div>
			`,
		})

	it('по умолчанию — только кнопки пользователя, строка и крестик тега без плагина', async () => {
		dispose = usePlugins(TButton, [TMarkPlugin])

		const wrapper = render()

		await nextTick()

		expect(installedOn).toHaveLength(1)
		expect(installedOn[0].text).toBe('Своя')

		wrapper.unmount()
	})

	it("scope 'all' — и вложенные: строка и крестик тега", async () => {
		dispose = usePlugins(TButton, [TMarkPlugin], { scope: 'all' })

		const wrapper = render()

		await nextTick()

		expect(installedOn).toHaveLength(3)

		wrapper.unmount()
	})
})

/** Расширение реестра: запоминает владельцев, в чьи движки поставлено. */
const extendedOwners: object[] = []

class TOwnerProbeExtension implements IExtension<object> {
	readonly name = 'ownerProbe'
	readonly events = new TEvented<Record<string, never>>()

	constructor(owner: object) {
		extendedOwners.push(owner)
	}

	install(): void {}
}

describe('расширение на тип · useExtensions', () => {
	let dispose: (() => void) | null = null

	afterEach(() => {
		dispose?.()
		dispose = null
		extendedOwners.length = 0
	})

	/** Теги пользователя и Select с тегами в поле: у Select свои Tags — деталь. */
	const render = async () => {
		const wrapper = mount({
			components: { Tags, TagsItem, Select, SelectItem },
			template: `
				<div>
					<Tags><TagsItem value="a" text="A" /></Tags>
					<Select mode="multiple" editable :value="['0']">
						<SelectItem value="0" text="Москва" />
					</Select>
				</div>
			`,
		})

		await nextTick()

		return wrapper
	}

	it('по умолчанию — движок тегов пользователя, а не тегов в поле Select', async () => {
		dispose = useExtensions(TTags, [(owner) => new TOwnerProbeExtension(owner)])

		const wrapper = await render()

		expect(extendedOwners).toHaveLength(1)

		wrapper.unmount()
	})

	it("scope 'all' — и теги в поле Select", async () => {
		dispose = useExtensions(TTags, [(owner) => new TOwnerProbeExtension(owner)], {
			scope: 'all',
		})

		const wrapper = await render()

		expect(extendedOwners).toHaveLength(2)
		expect(extendedOwners.every((owner) => owner instanceof TTags)).toBe(true)

		wrapper.unmount()
	})
})

type TStepEvents = TPluginEvents & {
	'change:size': (size: number) => void
	step: (value: number) => void
}

/** Плагин со своим пропом и событием: пропсы — через `pluginProps`, события — конвертом. */
class TStepPlugin extends TBasePlugin<TButton, TStepEvents> {
	static defaultValues = { size: 1 }

	private _size = TStepPlugin.defaultValues.size

	get size(): number {
		return this._size
	}

	set size(value: number) {
		if (value === this._size) return

		this._size = value
		this.events.emit('change:size', value)
	}

	step(): void {
		this.events.emit('step', this._size)
	}
}

definePlugin({
	ctor: TStepPlugin,
	namespace: 'step',
	contribution: {
		props: { size: { type: Number, triggers: ['change:size'] } },
		events: ['step'],
	},
})

describe('плагин снаружи · pluginProps и plugin:event', () => {
	let dispose: (() => void) | null = null

	afterEach(() => {
		dispose?.()
		dispose = null
	})

	/** Монтирует кнопку и ловит её набор из `@bundle:create`. */
	const mountStep = async (props: Record<string, unknown>, install = false) => {
		const received: { bundle?: TPluginBundle } = {}

		const wrapper = mount(Button, {
			props: {
				...props,
				'onBundle:create': (bundle: unknown) => {
					if (!(bundle instanceof TPluginBundle)) return

					if (install) bundle.use(TStepPlugin)
					received.bundle = bundle
				},
			},
		})

		await nextTick()

		const plugin = received.bundle?.get(TStepPlugin)

		if (!plugin) throw new Error('плагин не поставлен')

		return { wrapper, plugin }
	}

	it('плагин реестра получает значение и его смену', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const { wrapper, plugin } = await mountStep({ pluginProps: { step_size: 5 } })

		expect(plugin.size).toBe(5)

		await wrapper.setProps({ pluginProps: { step_size: 7 } })

		expect(plugin.size).toBe(7)

		await wrapper.setProps({ pluginProps: {} })

		expect(plugin.size).toBe(1)

		wrapper.unmount()
	})

	it('плагин из `@bundle:create` получает ждавшее его значение', async () => {
		const { wrapper, plugin } = await mountStep({ pluginProps: { step_size: 3 } }, true)

		expect(plugin.size).toBe(3)

		wrapper.unmount()
	})

	it('событие плагина приходит в `@plugin:event` конвертом', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const { wrapper, plugin } = await mountStep({ pluginProps: { step_size: 2 } })

		plugin.step()

		expect(wrapper.emitted('plugin:event')).toEqual([[{ name: 'step:step', args: [2] }]])

		wrapper.unmount()
	})
})
