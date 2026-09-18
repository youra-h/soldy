// @vitest-environment jsdom

/**
 * Внешний плагин не расширяет контракт компонента.
 *
 * Пропсы, события и слоты объявляет только дескриптор — один и тот же во всех
 * шести адаптерах. Плагин из реестра живёт в наборе и работает, но наружу
 * компонента ничего не добавляет: ни пропа в аксессоре, ни события в
 * привязках. Настраивают его опциями регистрации, а разговаривают через его
 * собственный API.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TButton } from '@soldy/core'
import type { IButton } from '@soldy/core'
import { TBasePlugin } from '@soldy/plugins'
import type { IPluginContext, TPluginEvents } from '@soldy/plugins'
import { ButtonDescriptor, bindComponent, createAdapterContext, usePlugins } from '@soldy/setup'
import { CallbackProfile } from './helpers'

type TIntervalEvents = TPluginEvents & {
	'change:value': (value: number) => void
	tick: (count: number) => void
}

/** Плагин со своим свойством и событием — ни то, ни другое наружу не выходит. */
class TIntervalPlugin extends TBasePlugin<IButton, TIntervalEvents> {
	private _value = 1000

	override install(ctx: IPluginContext, options?: { value?: number }): void {
		super.install(ctx, options)

		if (options?.value !== undefined) this._value = options.value
	}

	get value(): number {
		return this._value
	}

	tick(count: number): void {
		this.events.emit('tick', count)
	}
}

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
})

describe('внешний плагин · контракт компонента', () => {
	it('плагин стоит в наборе, а его свойство в аксессор не попадает', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {})

		expect(context.bundle?.get(TIntervalPlugin)).toBeInstanceOf(TIntervalPlugin)
		expect(context.accessor.getProps(true).some((p) => p.name.name === 'value')).toBe(false)
	})

	it('событие плагина в привязках компонента не объявлено', () => {
		dispose = usePlugins(TButton, [TIntervalPlugin])

		const context = createAdapterContext(ButtonDescriptor(), {})
		const { surface } = bindComponent(context, CallbackProfile)
		const onTick = vi.fn()

		expect(surface.events.some((event) => event.raw === 'tick')).toBe(false)

		// Подписка на сам плагин работает: у него своя шина
		context.bundle?.get(TIntervalPlugin)?.events.on('tick', onTick)
		context.bundle?.get(TIntervalPlugin)?.tick(3)

		expect(onTick).toHaveBeenCalledWith(3)
	})

	it('настройка плагина — опции регистрации', () => {
		dispose = usePlugins(TButton, [{ ctor: TIntervalPlugin, options: { value: 250 } }])

		const context = createAdapterContext(ButtonDescriptor(), {})

		expect(context.bundle?.get(TIntervalPlugin)?.value).toBe(250)
	})
})
