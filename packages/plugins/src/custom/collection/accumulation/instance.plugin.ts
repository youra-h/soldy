import type { IComponentView } from '@soldy/core'
import type { IPluginContext } from '../../../base'
import { TAccumulationPlugin } from './accumulation.plugin'
import type { TInstanceAccumulationEvents } from './types'
import { TEvented } from '@soldy/core'

/**
 * Накопление инстансов элементов коллекции.
 *
 * Получает {@link IComponentView} через instance из события item:registered.
 *
 * @events
 * - `instance:added` — при появлении нового instance
 * - `instance:removed` — при удалении instance
 */
export class TInstanceAccumulationPlugin extends TAccumulationPlugin<
	IComponentView,
	TInstanceAccumulationEvents
> {
	override install(ctx: IPluginContext): void {
		super.install(ctx)
	}

	protected _track(uid: string | number, ctx: IPluginContext): void {
		const instance = ctx.getInstance<IComponentView>()

		if (!instance) return

		this._add(uid, instance)

		// При удалении элемента из коллекции — убираем из реестра
		instance.events.on('change:rendered', (rendered: boolean) => {
			if (!rendered) {
				this._remove(uid)
			}
		})
	}

	protected override _add(uid: string | number, instance: IComponentView): void {
		super._add(uid, instance)
		;(this.events as TEvented<TInstanceAccumulationEvents>).emit('instance:added', {
			uid,
			instance,
		})
	}

	protected override _remove(uid: string | number): void {
		super._remove(uid)
		;(this.events as TEvented<TInstanceAccumulationEvents>).emit('instance:removed', { uid })
	}
}
