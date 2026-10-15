/**
 * Плагин, поставленный снаружи: пропсы через `pluginProps`, события через
 * `plugin:event`.
 *
 * Тот же канал, что во Vue (`:plugin-props`, `@plugin:event`), React
 * (`pluginProps`, `onPluginEvent`) и Angular: поверхность компонента одна на
 * тип, а контракт внешнего плагина известен только в рантайме
 * (`definePlugin` записывает его за классом). У элемента это свойство
 * `pluginProps` или атрибут `plugin-props` с JSON и событие `so:plugin:event` с
 * конвертом в `detail`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { TPluginEvents } from '@soldy-ui/plugins'
import { definePlugin, usePlugins } from '@soldy-ui/setup'
import { TButtonElement, type TButtonElementProps } from '@soldy-ui/webc'

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

/** Рендер коалесцируется в микротаске, набор объявляется на микрозадаче. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
	document.body.innerHTML = ''
})

function isSoldyButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/**
 * Кнопка из JS, ещё не подключённая, и набор её плагинов — когда придёт.
 * `pluginProps` — не свойство инстанса, а проп связки: в типе элемента его
 * нет, и пишется он так же, как любое свойство пропа, — присваиванием.
 */
function createButton(): { el: TButtonElementProps; bundle: () => TPluginBundle | undefined } {
	const el = document.createElement('button', { is: 'so-button' })

	if (!isSoldyButton(el)) throw new Error('<button is="so-button"> нет')

	let bundle: TPluginBundle | undefined

	el.addEventListener('so:bundle:create', (event) => {
		if (event instanceof CustomEvent && event.detail instanceof TPluginBundle) {
			bundle = event.detail
		}
	})

	return { el, bundle: () => bundle }
}

describe('плагин снаружи · pluginProps и so:plugin:event', () => {
	it('плагин реестра получает значение свойства и его смену, снятое — умолчание', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const { el, bundle } = createButton()

		Reflect.set(el, 'pluginProps', { step_size: 5 })
		document.body.appendChild(el)
		await flush()

		const plugin = () => bundle()?.get(TStepPlugin)

		expect(plugin()?.size).toBe(5)

		Reflect.set(el, 'pluginProps', { step_size: 7 })

		expect(plugin()?.size).toBe(7)

		Reflect.set(el, 'pluginProps', undefined)

		expect(plugin()?.size).toBe(1)
	})

	it('атрибут plugin-props — JSON того же мешка', async () => {
		dispose = usePlugins(TButton, [TStepPlugin])

		const { el, bundle } = createButton()

		el.setAttribute('plugin-props', '{"step_size":4}')
		document.body.appendChild(el)
		await flush()

		expect(bundle()?.get(TStepPlugin)?.size).toBe(4)

		el.removeAttribute('plugin-props')

		expect(bundle()?.get(TStepPlugin)?.size).toBe(1)
	})

	it('плагин из so:bundle:create получает ждавшее его значение, события — конвертом', async () => {
		const { el, bundle } = createButton()
		const events: unknown[] = []

		el.addEventListener('so:bundle:create', (event) => {
			if (event instanceof CustomEvent && event.detail instanceof TPluginBundle) {
				event.detail.use(TStepPlugin)
			}
		})
		el.addEventListener('so:plugin:event', (event) => {
			if (event instanceof CustomEvent) events.push(event.detail)
		})
		Reflect.set(el, 'pluginProps', { step_size: 3 })
		document.body.appendChild(el)
		await flush()

		const plugin = bundle()?.get(TStepPlugin)

		expect(plugin?.size).toBe(3)

		plugin?.step()

		expect(events).toEqual([{ name: 'step:step', args: [3] }])
	})
})
