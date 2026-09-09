import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TListLayoutPlugin } from '../layout'
import type { IListAutoWidthOwner } from './types'

/**
 * TListAutoWidthPlugin — класс `--auto-width` по свойству `autoWidth`.
 *
 * Свойство объявляет и хранит `TListLayoutPlugin`, этот плагин его читает и
 * применяет. Плагин крошечный намеренно: его размер — это и есть размер
 * обязанности, а не повод сложить её к соседям.
 *
 * Писать в `classes` отсюда законно и вовремя: `install` выполняется внутри
 * `createAdapterContext`, то есть в `setup` — **до первой отрисовки**, включая
 * серверную.
 */
export class TListAutoWidthPlugin extends TBasePlugin<any> {
	private _owner: IListAutoWidthOwner | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IListAutoWidthOwner>()

		const layout = ctx.get(TListLayoutPlugin)

		this._apply(layout?.autoWidth ?? false)

		layout?.events.on('change:autoWidth', (value) => this._apply(value))
	}

	override destroy(): void {
		this._owner = null

		super.destroy()
	}

	private _apply(value: boolean): void {
		this._owner?.classes.toggle('--auto-width', value)
	}
}
