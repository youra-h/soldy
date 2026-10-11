/**
 * Плагин, поставленный снаружи: пропсы через `pluginProps`, события через `onPluginEvent`.
 *
 * Тот же канал, что во Vue (`:plugin-props`, `@plugin:event`), React, Svelte,
 * Angular и Web Components: поверхность компонента одна на тип, а контракт
 * внешнего плагина известен только в рантайме (`definePlugin` записывает его
 * за классом). Сценарии — те же, что у React (`external-plugin.spec.tsx`).
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSignal } from 'solid-js'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { TPluginEvents } from '@soldy-ui/plugins'
import { definePlugin, usePlugins, type TExternalPluginProps } from '@soldy-ui/setup'
import { Button } from '@soldy-ui/solid'
import { mount } from './mount'

type TStepEvents = TPluginEvents & {
	'change:size': (size: number) => void
	step: (value: number) => void
}

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

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
})

/** Набор кнопки приходит в `onBundleCreate` на микрозадаче. */
const flush = () => Promise.resolve()

describe('плагин снаружи · pluginProps и onPluginEvent', () => {
	it('плагин реестра получает значение и его смену', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const received: { bundle?: TPluginBundle } = {}
		const [pluginProps, setPluginProps] = createSignal<TExternalPluginProps | undefined>({
			step_size: 5,
		})

		mount(() => (
			<Button
				text="Ok"
				pluginProps={pluginProps()}
				onBundleCreate={(value: unknown) => {
					if (value instanceof TPluginBundle) received.bundle = value
				}}
			/>
		))
		await flush()

		const plugin = () => received.bundle?.get(TStepPlugin)

		expect(plugin()?.size).toBe(5)

		setPluginProps({ step_size: 7 })

		expect(plugin()?.size).toBe(7)

		setPluginProps(undefined)

		expect(plugin()?.size).toBe(1)
	})

	it('плагин из `onBundleCreate` получает ждавшее его значение, события — конвертом', async () => {
		const received: { bundle?: TPluginBundle } = {}
		const onPluginEvent = vi.fn()

		mount(() => (
			<Button
				text="Ok"
				pluginProps={{ step_size: 3 }}
				onBundleCreate={(value: unknown) => {
					if (!(value instanceof TPluginBundle)) return

					value.use(TStepPlugin)
					received.bundle = value
				}}
				onPluginEvent={onPluginEvent}
			/>
		))
		await flush()

		const plugin = received.bundle?.get(TStepPlugin)

		expect(plugin?.size).toBe(3)

		plugin?.step()

		expect(onPluginEvent).toHaveBeenCalledWith({ name: 'step:step', args: [3] })
	})
})
