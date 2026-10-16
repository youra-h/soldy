import type { IToasts, IToastsItem, TToastsCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { afterTransitions } from '../../../utils'
import type { TToastsRemovalPluginEvents } from './types'

/**
 * TToastsRemovalPlugin — закрытый тост уходит из коллекции, когда догас.
 *
 * Закрытый тост из разметки не прячется: тема ведёт его переходом по
 * `data-open="false"` — он гаснет, уезжает к стороне жеста, а место его
 * схлопывается, — и коллекция держит его, пока переходы его узла не
 * доиграли (`afterTransitions`), а потом удаляет (`plain.remove`). Сними его
 * сразу — узел ушёл бы из документа посреди исчезания. Чисел темы плагин не
 * знает: сколько ждать, решает переход; без движения и без переходов (jsdom)
 * — тем же кадром.
 *
 * Узла у тоста нет — он не нарисован (вытеснен за предел видимых, региона нет
 * или его ещё не отрисовали) — гаснуть нечему, и тост удаляется сразу.
 *
 * Закрытые до привязки движка — тосты, закрытые, пока компонента не было, —
 * удаляются при привязке: их узлов в этом монтировании нет. Набор уничтожают,
 * пока тост гаснет, — ожидание снимается, а тост удаляется сразу: он закрыт, а
 * движок снаружи переживает компонент.
 */
export class TToastsRemovalPlugin extends TBasePlugin<IToasts, TToastsRemovalPluginEvents> {
	private _engine: TToastsCollection | null = null
	private _elements: TCollectionElements | null = null
	/** Тосты, которые гаснут: отмена ожидания — по тосту. */
	private readonly _fading = new Map<IToastsItem, () => void>()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._elements = ctx.get(TCollectionElements) ?? null

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) =>
			this._bindEngine(engine),
		)
	}

	override destroy(): void {
		const fading = [...this._fading]

		this._fading.clear()

		for (const [toast, cancel] of fading) {
			cancel()
			this._remove(toast)
		}

		this._engine = null
		this._elements = null

		super.destroy()
	}

	private _bindEngine(engine: TToastsCollection): void {
		this._engine = engine

		this._listenTo(engine.extensions.toasts.events, 'item:close', (toast) => this._fade(toast))

		for (const toast of engine.extensions.batch.items) {
			if (!toast.open) this._remove(toast)
		}
	}

	/** Закрытый тост: дождаться, пока его узел догаснет, и удалить. */
	private _fade(toast: IToastsItem): void {
		const node = this._elements?.getElementByItem(toast)

		if (!node) {
			this._remove(toast)

			return
		}

		this._fading.get(toast)?.()
		this._fading.set(
			toast,
			afterTransitions(node, () => {
				this._fading.delete(toast)
				this._remove(toast)
			}),
		)
	}

	private _remove(toast: IToastsItem): void {
		this._engine?.extensions.plain.remove(toast)
	}
}
