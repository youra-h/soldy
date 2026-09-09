import type { TScrollBehavior } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import type { TListLayoutPluginEvents, TListLayoutPluginOptions } from './types'

/**
 * TListLayoutPlugin — свойства раскладки списка. **Только свойства.**
 *
 * Плагин владеет `maxRows`, `wordWrap`, `autoWidth`, `scrollBehavior`: хранит
 * значение, отдаёт его и сообщает о смене событием. Ни DOM, ни коллекции, ни
 * наблюдателей здесь нет — за каждое следствие отвечает свой плагин, который
 * это свойство читает:
 *
 * | Свойство | Кто применяет |
 * |---|---|
 * | `maxRows` | `TListHeightPlugin` — высота контейнера элементов |
 * | `wordWrap` | `TListWordWrapPlugin` — `data-word-wrap` на элементах |
 * | `autoWidth` | `TListAutoWidthPlugin` — класс `--auto-width` |
 * | `scrollBehavior` | `TListScrollPlugin` — как прокручивать к элементу |
 *
 * Так свойство и его следствие разделены: подключить раскладку можно без
 * поведения (Select берёт не всё), а поведение читается по одному файлу вместо
 * четырёх смешанных в одном.
 *
 * Пропы объявлены в contribution с `flatProps`, поэтому наружу выглядят
 * обычными пропами компонента (`maxRows`, а не `layout_maxRows`). Так они
 * достаются любому компоненту, подключившему плагин, без общего предка: ListBox
 * — список сам по себе, Select — поле с панелью, наследоваться друг от друга
 * они не могут (Select растёт от `TInputControl`), а раскладка нужна обоим.
 */
export class TListLayoutPlugin extends TBasePlugin<any, TListLayoutPluginEvents> {
	private _maxRows = 0
	private _wordWrap = false
	private _autoWidth = false
	private _scrollBehavior: TScrollBehavior = 'smooth'

	override install(ctx: IPluginContext, options?: TListLayoutPluginOptions): void {
		super.install(ctx, options)

		this._maxRows = options?.maxRows ?? this._maxRows
		this._wordWrap = options?.wordWrap ?? this._wordWrap
		this._autoWidth = options?.autoWidth ?? this._autoWidth
		this._scrollBehavior = options?.scrollBehavior ?? this._scrollBehavior
	}

	/** Сколько строк показывать до появления прокрутки. `0` — все. */
	get maxRows(): number {
		return this._maxRows
	}

	set maxRows(value: number) {
		if (this._maxRows === value) return

		this._maxRows = value
		this.events.emit('change:maxRows', value)
	}

	/** Переносить длинный текст элемента вместо обрезки многоточием. */
	get wordWrap(): boolean {
		return this._wordWrap
	}

	set wordWrap(value: boolean) {
		if (this._wordWrap === value) return

		this._wordWrap = value
		this.events.emit('change:wordWrap', value)
	}

	/** Ширина по содержимому вместо фиксированной. */
	get autoWidth(): boolean {
		return this._autoWidth
	}

	set autoWidth(value: boolean) {
		if (this._autoWidth === value) return

		this._autoWidth = value
		this.events.emit('change:autoWidth', value)
	}

	/** Как прокручивать к элементу при навигации. */
	get scrollBehavior(): TScrollBehavior {
		return this._scrollBehavior
	}

	set scrollBehavior(value: TScrollBehavior) {
		if (this._scrollBehavior === value) return

		this._scrollBehavior = value
		this.events.emit('change:scrollBehavior', value)
	}
}
