/**
 * Плагин, поставленный снаружи: пропсы через вход `pluginProps`, события через
 * выход `pluginEvent`.
 *
 * Тот же канал, что во Vue (`:plugin-props`, `@plugin:event`), React, Solid и
 * Web Components: поверхность компонента одна на тип — у Angular её объявляет
 * кодогенерация, раньше, чем приложение зарегистрирует плагины, — а контракт
 * внешнего плагина известен только в рантайме (`definePlugin` записывает его
 * за классом).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TButton, type TPluginEvent } from '@soldy-ui/core'
import { TBasePlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { TPluginEvents } from '@soldy-ui/plugins'
import { definePlugin, usePlugins, type TExternalPluginProps } from '@soldy-ui/setup'
import { TButtonComponent } from '@soldy-ui/angular'
import { announced } from './element-plugin'
import { mountHost } from './mount'

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

/**
 * Хост потребителя: мешок пропсов внешних плагинов — сигнал, набор кнопки и
 * конверты событий — то, что пришло в выходы.
 */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button
		so-button
		text="Ok"
		[pluginProps]="pluginProps()"
		(bundleCreate)="onBundle($event)"
		(pluginEvent)="events.push($event)"
	></button>`,
})
class Host {
	readonly pluginProps = signal<TExternalPluginProps | undefined>({ step_size: 5 })
	readonly events: TPluginEvent[] = []
	bundle?: TPluginBundle

	/** Плагин из `(bundleCreate)` — его ставит тест, если задал `use`. */
	use?: (bundle: TPluginBundle) => void

	onBundle(value: unknown): void {
		if (!(value instanceof TPluginBundle)) return

		this.use?.(value)
		this.bundle = value
	}
}

let dispose: (() => void) | undefined

afterEach(() => {
	dispose?.()
	dispose = undefined
})

describe('плагин снаружи · pluginProps и pluginEvent', () => {
	it('плагин реестра получает значение и его смену; снятый ключ — умолчание', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const fixture = mountHost(Host)

		await announced()

		const plugin = () => fixture.componentInstance.bundle?.get(TStepPlugin)

		expect(plugin()?.size).toBe(5)

		fixture.componentInstance.pluginProps.set({ step_size: 7 })
		fixture.detectChanges()

		expect(plugin()?.size).toBe(7)

		fixture.componentInstance.pluginProps.set(undefined)
		fixture.detectChanges()

		expect(plugin()?.size).toBe(1)
	})

	it('плагин из (bundleCreate) получает ждавшее его значение, события — конвертом', async () => {
		const fixture = TestBed.createComponent(Host)

		fixture.componentInstance.use = (bundle) => bundle.use(TStepPlugin)
		fixture.detectChanges()
		await announced()

		const plugin = fixture.componentInstance.bundle?.get(TStepPlugin)

		expect(plugin?.size).toBe(5)

		plugin?.step()

		expect(fixture.componentInstance.events).toEqual([{ name: 'step:step', args: [5] }])
	})
})
