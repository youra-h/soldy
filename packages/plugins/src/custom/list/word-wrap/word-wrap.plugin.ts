import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TCollectionBundlesPlugin } from '../../collection'
import { TListLayoutPlugin } from '../layout'
import type { IListWordWrapItem } from './types'

/**
 * TListWordWrapPlugin — `data-word-wrap` на элементах списка.
 *
 * Разрешает пару «значение элемента поверх значения списка»: списочное берётся
 * у `TListLayoutPlugin`, собственное — у самого элемента, где `undefined`
 * означает «наследовать».
 *
 * Разрешение живёт здесь, а не в шаблоне: `:data-word-wrap="…"` повторил бы это
 * правило в каждом из шести адаптеров.
 *
 * Атрибут ставится **на регистрации бандла**, то есть в `setup` элемента — до
 * его первой отрисовки, включая серверную. `install` плагина выполняется внутри
 * `createAdapterContext`, а не после монтирования.
 */
export class TListWordWrapPlugin extends TBasePlugin<any> {
	private _bundles: TCollectionBundlesPlugin | null = null
	private _layout: TListLayoutPlugin | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null
		this._layout = ctx.get(TListLayoutPlugin) ?? null

		this._bundles?.events.on('bundle:registered', ({ bundle }) => {
			this._applyTo(bundle.getInstance<IListWordWrapItem>())
		})

		this._bundles?.events.on('engine:bound', (collection) => {
			collection.driver.events.on('change:items', () => this._applyAll())
		})

		this._layout?.events.on('change:wordWrap', () => this._applyAll())
	}

	override destroy(): void {
		this._bundles = null
		this._layout = null

		super.destroy()
	}

	private _applyAll(): void {
		for (const bundle of this._bundles?.getAll() ?? []) {
			this._applyTo(bundle.getInstance<IListWordWrapItem>())
		}
	}

	private _applyTo(item: IListWordWrapItem | null): void {
		item?.dataset?.add('word-wrap', item.wordWrap ?? this._layout?.wordWrap ?? false)
	}
}
