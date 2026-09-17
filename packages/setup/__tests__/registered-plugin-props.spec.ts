// @vitest-environment jsdom

/**
 * Пропсы и события плагина реестра.
 *
 * Плагин, зарегистрированный определением `definePlugin`, выходит наружу
 * компонента так же, как плагины дескриптора: пропсы и события попадают в
 * аксессор, а по нему их читают и отдают адаптеры. Типы — дополнение
 * `IRegisteredPlugins`: регистрация в рантайме типов не меняет.
 */

import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest'
import { TButton, TComponent } from '@soldy/core'
import type { IButton, ISwitch } from '@soldy/core'
import { TBasePlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TPluginEvents } from '@soldy/plugins'
import {
	ButtonDescriptor,
	ComponentDescriptor,
	collectEventBindings,
	createAdapterContext,
	createInspectorFactory,
	callbackEventNaming,
	definePlugin,
	underscorePropNaming,
	usePlugins,
} from '@soldy/setup'
import type { TRegisteredPluginEvents, TRegisteredPluginProps } from '@soldy/setup'
import { required } from './helpers'

type TIntervalEvents = TPluginEvents & {
	'change:value': (value: number) => void
	tick: (count: number) => void
}

type TIntervalProps = { value?: number }

/** Плагин с пропом `value` и событием `tick`. */
class TIntervalPlugin extends TBasePlugin<IButton, TIntervalEvents> {
	private _value = 1000

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

const IntervalPluginDescriptor = () =>
	definePlugin<'interval', TIntervalEvents, TIntervalProps>({
		ctor: TIntervalPlugin,
		namespace: 'interval',
		contribution: {
			props: { value: { type: Number, triggers: ['change:value'] } },
			events: [...PLUGIN_EVENTS, 'tick'],
		},
	})

declare module '@soldy/setup' {
	interface IRegisteredPlugins {
		interval: { type: IButton; plugin: ReturnType<typeof IntervalPluginDescriptor> }
	}
}

const createInspector = createInspectorFactory({
	prop: underscorePropNaming,
	event: callbackEventNaming,
})

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
})

describe('плагин реестра · пропсы и события', () => {
	it('проп плагина — в аксессоре компонента и пишет в плагин', () => {
		dispose = usePlugins(TButton, [IntervalPluginDescriptor()])

		const context = createAdapterContext(ButtonDescriptor(), {})
		const prop = required(
			context.accessor.getProps(false).find((p) => p.name.name === 'value'),
			'interval_value',
		)
		const plugin = required(context.bundle?.get(TIntervalPlugin), 'TIntervalPlugin')

		expect(createInspector(context.accessor).getExportPropName(prop)).toBe('interval_value')

		context.accessor.setValue(prop, 250)

		expect(plugin.value).toBe(250)
	})

	it('событие плагина — в привязках событий компонента', () => {
		dispose = usePlugins(TButton, [IntervalPluginDescriptor()])

		const context = createAdapterContext(ButtonDescriptor(), {})
		const onTick = vi.fn()

		for (const binding of collectEventBindings(
			context.accessor,
			createInspector(context.accessor),
		)) {
			if (binding.exportName === 'onIntervalTick') binding.source.on(binding.rawName, onTick)
		}

		context.bundle?.get(TIntervalPlugin)?.tick(3)

		expect(onTick).toHaveBeenCalledWith(3)
	})

	it('класс без определения пропсов наружу не отдаёт', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {})

		expect(context.bundle?.get(TIntervalPlugin)).toBeInstanceOf(TIntervalPlugin)
		expect(context.accessor.getProps(false).some((p) => p.name.name === 'value')).toBe(false)
	})

	/**
	 * Фасад коллекции делит набор с компонентом, и его аксессор строится на
	 * том же наборе. Отдай ему плагины реестра — событие плагина ушло бы
	 * наружу дважды.
	 */
	it('аксессор другого инстанса на том же наборе плагинов реестра не получает', () => {
		dispose = usePlugins(TButton, [IntervalPluginDescriptor()])

		const owner = createAdapterContext(ButtonDescriptor(), {})
		const shared = createAdapterContext(
			ComponentDescriptor(),
			{ ctrl: new TComponent() },
			{ bundle: owner.bundle, defaultExtensions: [] },
		)

		expect(shared.accessor.getProps(false).some((p) => p.name.name === 'value')).toBe(false)
	})

	it('типы: пропсы и события — у компонента своего типа, у чужого их нет', () => {
		expectTypeOf<TRegisteredPluginProps<IButton>>()
			.toHaveProperty('interval_value')
			.toEqualTypeOf<number | undefined>()
		expectTypeOf<TRegisteredPluginEvents<IButton>>().toHaveProperty('interval:tick')
		expectTypeOf<TRegisteredPluginProps<ISwitch>>().not.toHaveProperty('interval_value')
	})
})
