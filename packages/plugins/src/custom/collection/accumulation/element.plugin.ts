import { TElementPlugin } from '../../element'
import type { IComponentView } from '@soldy/core'
import type { IPluginContext } from '../../../base'
import { TAccumulationPlugin } from './accumulation.plugin'
import type { TElementAccumulationEvents } from './types'
import { TEvented } from '@soldy/core'

/**
 * Накопление DOM-элементов элементов коллекции.
 *
 * Извлекает {@link HTMLElement} из {@link TElementPlugin} каждого item'а.
 * Следит за `present` через instance.
 *
 * @events
 * - `element:added` — при появлении нового DOM-элемента
 * - `element:removed` — при удалении DOM-элемента
 * - `element:present` — при изменении видимости элемента
 */
export class TElementAccumulationPlugin extends TAccumulationPlugin<
	HTMLElement,
	TElementAccumulationEvents
> {
	private readonly _present = new Map<string | number, boolean>()

	override install(ctx: IPluginContext): void {
		super.install(ctx)
	}

	protected _track(uid: string | number, ctx: IPluginContext): void {
		const elementPlugin = ctx.get(TElementPlugin)

		if (!elementPlugin) return

		// Если элемент уже готов — добавляем сразу
		if (elementPlugin.element) {
			this._add(uid, elementPlugin.element)
		}

		elementPlugin.events.on('ready', (element) => {
			this._add(uid, element)
		})

		elementPlugin.events.on('removed', () => {
			this._present.delete(uid)
			this._remove(uid)
		})

		// present — через instance из контекста
		const instance = ctx.getInstance<IComponentView>()

		if (instance) {
			this._present.set(uid, instance.present)

			instance.events.on('change:present', (value: boolean) => {
				this._present.set(uid, value)
				;(this.events as TEvented<TElementAccumulationEvents>).emit('element:present', {
					uid,
					present: value,
				})
			})
		}
	}

	protected override _add(uid: string | number, element: HTMLElement): void {
		super._add(uid, element)
		;(this.events as TEvented<TElementAccumulationEvents>).emit('element:added', {
			uid,
			element,
		})
	}

	protected override _remove(uid: string | number): void {
		super._remove(uid)
		;(this.events as TEvented<TElementAccumulationEvents>).emit('element:removed', { uid })
	}

	/** Найти uid по DOM-элементу. */
	getUidByElement(element: HTMLElement): string | number | null {
		return this.getUidByValue(element)
	}
}
