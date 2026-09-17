/**
 * Плагин реестра в React: проп и событие плагина, зарегистрированного
 * определением `definePlugin`, приходят и уходят как у плагинов дескриптора.
 *
 * React читает пропсы по аксессору, поэтому объявлять их адаптеру не нужно.
 * Типы — дополнение `IRegisteredPlugins` ниже: без него `interval_value` не
 * скомпилировался бы.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TButton } from '@soldy/core'
import type { IButton } from '@soldy/core'
import { PLUGIN_EVENTS, TBasePlugin } from '@soldy/plugins'
import type { IPluginContext, TPluginEvents } from '@soldy/plugins'
import { definePlugin, usePlugins } from '@soldy/setup'
import { Button, type ButtonProps } from '@soldy/ui-react'

type TIntervalEvents = TPluginEvents & {
	'change:value': (value: number) => void
	tick: (count: number) => void
}

class TIntervalPlugin extends TBasePlugin<IButton, TIntervalEvents> {
	static instances: TIntervalPlugin[] = []

	private _value = 1000

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)
		TIntervalPlugin.instances.push(this)
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

const IntervalPluginDescriptor = () =>
	definePlugin<'interval', TIntervalEvents, { value?: number }>({
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

const roots: Root[] = []
let dispose: (() => void) | null = null

function render(root: Root, props: ButtonProps): void {
	act(() => root.render(<Button {...props} />))
}

function createTarget(): Root {
	const target = document.createElement('div')

	document.body.appendChild(target)

	const root = createRoot(target)

	roots.push(root)

	return root
}

afterEach(() => {
	for (const root of roots.splice(0).reverse()) act(() => root.unmount())

	dispose?.()
	dispose = null
	TIntervalPlugin.instances.length = 0
	document.body.innerHTML = ''
})

describe('плагин реестра · React', () => {
	it('проп доходит до плагина и обновляется, событие приходит в колбэк', () => {
		dispose = usePlugins(TButton, [IntervalPluginDescriptor()])

		const onIntervalTick = vi.fn()
		const root = createTarget()

		render(root, { interval_value: 250, onIntervalTick })

		const [plugin] = TIntervalPlugin.instances

		expect(plugin.value).toBe(250)

		render(root, { interval_value: 500, onIntervalTick })

		expect(plugin.value).toBe(500)

		act(() => plugin.tick(4))

		expect(onIntervalTick.mock.calls).toEqual([[4]])
	})
})
