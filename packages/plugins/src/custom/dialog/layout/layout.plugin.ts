import type { IDialog } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { toCssValue } from '../../../utils'
import type { TDialogLayoutPluginEvents } from './types'

/**
 * Раскладка модального окна: слой и размер — в объекты стилей для разметки.
 *
 * Окно ничего не меряет и координат не считает: место и разворот раскладывает
 * тема по модификатору и `data-maximized`. Плагину остаются значения, которые
 * в класс не уложить:
 *
 * - `styles` — панели: `z-index` слоя и размер переменными `--dialog-width`
 *   и `--dialog-height`. Переменными, а не инлайном `width` и `height`:
 *   инлайн перебил бы тему, а у неё развёрнутое окно на весь экран и потолок
 *   размера по экрану. Незаданный размер переменной не даёт вовсе — тогда
 *   действует умолчание темы (`var(--dialog-width, …)`);
 * - `backdropStyles` — подложке: тот же `z-index`. Подложка стоит в DOM
 *   раньше панели, и панель рисуется поверх неё просто порядком.
 *
 * Считает при установке и на смену ширины, высоты и слоя. Объекты
 * заменяются целиком, а не мутируются: геттер отдаёт ссылку наружу, и без
 * смены идентичности адаптер не увидит изменения.
 *
 * @example
 * // dialog.width = 480 → styles: { 'z-index': 1001, '--dialog-width': '480px' }
 */
export class TDialogLayoutPlugin extends TBasePlugin<any, TDialogLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}
	private _backdropStyles: Record<string, string | number> = {}
	private _dialog: IDialog | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const dialog = ctx.getInstance<IDialog>()

		if (!dialog) return

		this._dialog = dialog

		const updateStyles = () => this._updateStyles()

		dialog.events.on('change:width', updateStyles)
		dialog.events.on('change:height', updateStyles)
		dialog.events.on('change:zIndex', updateStyles)
		dialog.events.on('change:zIndex', () => this._updateBackdropStyles())

		this._updateStyles()
		this._updateBackdropStyles()
	}

	/** Стили панели: `z-index` слоя и переменные размера. */
	get styles(): Record<string, string | number> {
		return this._styles
	}

	/** Стили подложки: тот же `z-index`, что у панели. */
	get backdropStyles(): Record<string, string | number> {
		return this._backdropStyles
	}

	override destroy(): void {
		this._dialog = null

		super.destroy()
	}

	private _updateStyles(): void {
		const dialog = this._dialog

		if (!dialog) return

		const styles: Record<string, string | number> = { 'z-index': dialog.zIndex }

		if (dialog.width !== undefined) styles['--dialog-width'] = toCssValue(dialog.width)
		if (dialog.height !== undefined) styles['--dialog-height'] = toCssValue(dialog.height)

		this._styles = styles
		this.events.emit('change:styles', this._styles)
	}

	private _updateBackdropStyles(): void {
		const dialog = this._dialog

		if (!dialog) return

		this._backdropStyles = { 'z-index': dialog.zIndex }
		this.events.emit('change:backdropStyles', this._backdropStyles)
	}
}
