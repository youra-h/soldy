// @vitest-environment jsdom

/**
 * Плагин, поставленный снаружи: пропсы через `pluginProps`, события через `onPluginEvent`.
 *
 * Тот же канал, что во Vue (`:plugin-props`, `@plugin:event`), Angular и Web
 * Components: поверхность компонента одна на тип, а контракт внешнего плагина
 * известен только в рантайме (`definePlugin` записывает его за классом).
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import type { ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TButton } from '@soldy/core'
import { TBasePlugin, TPluginBundle } from '@soldy/plugins'
import type { TPluginEvents } from '@soldy/plugins'
import { definePlugin, usePlugins } from '@soldy/setup'
import { Button } from '@soldy/ui-react'

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

let root: Root | null = null
let dispose: (() => void) | null = null

function render(element: ReactElement): void {
	if (!root) {
		const target = document.createElement('div')

		document.body.appendChild(target)
		root = createRoot(target)
	}

	const current = root

	act(() => current.render(element))
}

/** Набор кнопки приходит в `onBundleCreate` на микрозадаче. */
async function flush(): Promise<void> {
	await act(async () => {
		await Promise.resolve()
	})
}

afterEach(() => {
	const current = root

	if (current) act(() => current.unmount())

	root = null
	dispose?.()
	dispose = null
	document.body.innerHTML = ''
})

describe('плагин снаружи · pluginProps и onPluginEvent', () => {
	it('плагин реестра получает значение и его смену', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const received: { bundle?: TPluginBundle } = {}
		const onBundleCreate = (value: unknown) => {
			if (value instanceof TPluginBundle) received.bundle = value
		}

		render(<Button text="Ok" pluginProps={{ step_size: 5 }} onBundleCreate={onBundleCreate} />)
		await flush()

		const plugin = () => received.bundle?.get(TStepPlugin)

		expect(plugin()?.size).toBe(5)

		render(<Button text="Ok" pluginProps={{ step_size: 7 }} onBundleCreate={onBundleCreate} />)

		expect(plugin()?.size).toBe(7)

		render(<Button text="Ok" onBundleCreate={onBundleCreate} />)

		expect(plugin()?.size).toBe(1)
	})

	it('плагин из `onBundleCreate` получает ждавшее его значение, события — конвертом', async () => {
		const received: { bundle?: TPluginBundle } = {}
		const onPluginEvent = vi.fn()
		const onBundleCreate = (value: unknown) => {
			if (!(value instanceof TPluginBundle)) return

			value.use(TStepPlugin)
			received.bundle = value
		}

		render(
			<Button
				text="Ok"
				pluginProps={{ step_size: 3 }}
				onBundleCreate={onBundleCreate}
				onPluginEvent={onPluginEvent}
			/>,
		)
		await flush()

		const plugin = received.bundle?.get(TStepPlugin)

		expect(plugin?.size).toBe(3)

		act(() => plugin?.step())

		expect(onPluginEvent).toHaveBeenCalledWith({ name: 'step:step', args: [3] })
	})
})
