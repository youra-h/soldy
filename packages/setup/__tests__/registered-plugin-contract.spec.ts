// @vitest-environment jsdom

/**
 * Плагин, поставленный снаружи: пропсы через `pluginProps`, события через `plugin:event`.
 *
 * Поверхность компонента объявляет только дескриптор, и она одна на тип: Vue,
 * Angular и Web Components объявляют её раньше, чем приложение регистрирует
 * плагины, а поставить плагин можно и позже — в `bundle:create`. Поэтому у
 * каждого компонента один проп на все внешние плагины — `pluginProps`
 * (`{ interval_value: 250 }`) — и одно событие-конверт — `plugin:event`
 * (`{ name, args }`). Какие пропсы и события у плагина, говорит его контракт:
 * `definePlugin` записывает его за классом.
 *
 * Раньше у внешнего плагина пропсов и событий не было вовсе: настраивали его
 * опциями регистрации, а разговаривали через его API.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TButton } from '@soldy/core'
import type { IButton } from '@soldy/core'
import { TAriaPlugin, TBasePlugin } from '@soldy/plugins'
import type { IPluginContext, TPluginEvents } from '@soldy/plugins'
import { ButtonDescriptor, createAdapterContext, definePlugin, usePlugins } from '@soldy/setup'
import type { TEventSink } from '@soldy/setup'
import { CallbackProfile, required } from './helpers'

type TIntervalEvents = TPluginEvents & {
	'change:value': (value: number) => void
	tick: (count: number) => void
}

/** Плагин со своим свойством и событием. */
class TIntervalPlugin extends TBasePlugin<IButton, TIntervalEvents> {
	static defaultValues = { value: 1000 }

	private _value = TIntervalPlugin.defaultValues.value

	override install(ctx: IPluginContext, options?: { value?: number }): void {
		super.install(ctx, options)

		if (options?.value !== undefined) this._value = options.value
	}

	get value(): number {
		return this._value
	}

	set value(value: number) {
		if (value === this._value) return

		this._value = value
		this.events.emit('change:value', value)
	}

	tick(count: number): void {
		this.events.emit('tick', count)
	}
}

/** Плагин без контракта: `definePlugin` для него не звали. */
class TSilentPlugin extends TBasePlugin<IButton> {}

const IntervalPluginDescriptor = definePlugin({
	ctor: TIntervalPlugin,
	namespace: 'interval',
	contribution: {
		props: { value: { type: Number, triggers: ['change:value'] } },
		events: ['tick'],
	},
})

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
})

/** Плагин из набора контекста — он там обязан быть. */
function plugin(context: ReturnType<typeof createAdapterContext>): TIntervalPlugin {
	return required(context.bundle?.get(TIntervalPlugin), 'TIntervalPlugin')
}

describe('внешний плагин · поверхность', () => {
	it('поверхность одна на тип: пропа плагина в ней нет, есть `pluginProps` и `plugin:event`', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const { surface } = createAdapterContext(ButtonDescriptor(), {}).connect(CallbackProfile)

		expect(surface.exportProps).not.toHaveProperty('interval_value')
		expect(surface.exportProps).toHaveProperty('pluginProps')
		expect(surface.exportEvents).toContain('onPluginEvent')
	})

	it('настройка опциями регистрации по-прежнему работает', () => {
		dispose = usePlugins(TButton, [{ ctor: TIntervalPlugin, options: { value: 250 } }])

		expect(plugin(createAdapterContext(ButtonDescriptor(), {})).value).toBe(250)
	})
})

describe('внешний плагин · pluginProps', () => {
	it('значение доходит до плагина реестра при сборке', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { interval_value: 250 } },
		})

		expect(plugin(context).value).toBe(250)
	})

	/**
	 * Пакет объявлен `sideEffects: false`: модуль определения, из которого ничего не
	 * взяли, сборщик выбрасывает вместе с записью контракта. Регистрация
	 * определением держит модуль в бандле.
	 */
	it('плагин ставится и определением — с опциями `with()`', () => {
		dispose = usePlugins(TButton, [IntervalPluginDescriptor.with({ value: 250 })])

		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { interval_value: 500 } },
		})

		expect(plugin(context).value).toBe(500)
		expect(plugin(createAdapterContext(ButtonDescriptor(), {})).value).toBe(250)
	})

	it('значение, равное умолчанию, ничего не задаёт — как у сборки', () => {
		dispose = usePlugins(TButton, [{ ctor: TIntervalPlugin, options: { value: 250 } }])

		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { interval_value: 1000 } },
		})

		expect(plugin(context).value).toBe(250)
	})

	it('плагин, поставленный позже, получает ждавшее его значение', () => {
		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { interval_value: 250 } },
		})

		context.bundle?.use(TIntervalPlugin)

		expect(plugin(context).value).toBe(250)
	})

	it('значение, пришедшее до плагина, ждёт его установки', () => {
		const context = createAdapterContext(ButtonDescriptor(), {})
		const binding = context.connect(CallbackProfile)

		binding.inputs.full({ pluginProps: { interval_value: 500 } })
		context.bundle?.use(TIntervalPlugin)

		expect(plugin(context).value).toBe(500)
	})

	it('смена значения пишется в плагин, пропавший ключ — возвращает умолчание', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { interval_value: 250 } },
		})
		const binding = context.connect(CallbackProfile)

		binding.inputs.full({ pluginProps: { interval_value: 500 } })

		expect(plugin(context).value).toBe(500)

		binding.inputs.full({ pluginProps: {} })

		expect(plugin(context).value).toBe(1000)
	})

	it('снятый `pluginProps` целиком возвращает умолчания', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { interval_value: 250 } },
		})

		context.connect(CallbackProfile).inputs.full({})

		expect(plugin(context).value).toBe(1000)
	})

	it('внешний ctrl: значения доходят до его плагинов так же', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {
			ctrl: new TButton(),
			props: { pluginProps: { interval_value: 250 } },
		})

		expect(plugin(context).value).toBe(250)
	})

	it('плагин дескриптора через `pluginProps` не пишется — его пропсы в поверхности', () => {
		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { aria_label: 'Закрыть' } },
		})

		expect(required(context.bundle?.get(TAriaPlugin), 'TAriaPlugin').label).toBeUndefined()
	})

	it('плагин без контракта значений не получает и не ломает сборку', () => {
		dispose = usePlugins(TButton, [TSilentPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {
			props: { pluginProps: { silent_value: 1 } },
		})

		expect(context.bundle?.get(TSilentPlugin)).toBeInstanceOf(TSilentPlugin)
	})

	it('снятый плагин значения больше не получает', () => {
		const context = createAdapterContext(ButtonDescriptor(), {})
		const binding = context.connect(CallbackProfile)

		context.bundle?.use(TIntervalPlugin)

		const removed = plugin(context)

		context.bundle?.remove(TIntervalPlugin)
		binding.inputs.full({ pluginProps: { interval_value: 500 } })

		expect(removed.value).toBe(1000)
	})
})

describe('внешний плагин · plugin:event', () => {
	/** Конверты, пришедшие в связку под именем фреймворка. */
	function envelopes(emit: ReturnType<typeof vi.fn<TEventSink>>): unknown[] {
		return emit.mock.calls
			.filter(([name]) => name === 'onPluginEvent')
			.map(([, args]) => args[0])
	}

	it('событие плагина уходит конвертом с полным именем', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {})
		const emit = vi.fn<TEventSink>()

		context.connect(CallbackProfile).events.listen(emit)
		plugin(context).tick(3)

		expect(envelopes(emit)).toEqual([{ name: 'interval:tick', args: [3] }])
	})

	it('триггер пропа плагина — тоже событие', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {})
		const emit = vi.fn<TEventSink>()

		context.connect(CallbackProfile).events.listen(emit)
		plugin(context).value = 42

		expect(envelopes(emit)).toEqual([{ name: 'interval:change:value', args: [42] }])
	})

	it("конверт виден и с инстанса: `ctrl.events.on('plugin:event')`", () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const onEvent = vi.fn()

		ctrl.events.on('plugin:event', onEvent)
		context.bundle?.use(TIntervalPlugin)
		plugin(context).tick(1)

		expect(onEvent).toHaveBeenCalledWith({ name: 'interval:tick', args: [1] })
	})

	it('после снятия плагина и уничтожения контекста конвертов нет', () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const onEvent = vi.fn()

		ctrl.events.on('plugin:event', onEvent)
		context.bundle?.use(TIntervalPlugin)

		const installed = plugin(context)

		context.bundle?.remove(TIntervalPlugin)
		installed.tick(1)

		context.bundle?.use(TIntervalPlugin)

		const second = plugin(context)

		context.destroy()
		second.tick(2)

		expect(onEvent).not.toHaveBeenCalled()
	})
})
