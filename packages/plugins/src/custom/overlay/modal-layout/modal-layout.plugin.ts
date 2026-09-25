import type { IModalLayer } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { toCssValue } from '../../../utils'
import type { TModalLayoutPluginEvents, TModalLayoutVariables } from './types'

/**
 * Раскладка модального слоя — общая часть окна и выезжающей панели: слой и
 * размер в объекты стилей для разметки.
 *
 * Модальный слой ничего не меряет и координат не считает: место, край,
 * разворот и анимацию раскладывает тема по модификаторам и `data-*`. Плагину
 * остаются значения, которые в класс не уложить:
 *
 * - `styles` — панели: `z-index` слоя и размер переменными. Переменными, а не
 *   инлайном `width` и `height`: инлайн перебил бы тему, а у неё потолок
 *   размера по экрану и развёрнутое окно. Незаданный размер переменной не
 *   даёт вовсе — тогда действует умолчание темы (`var(--dialog-width, …)`);
 * - `backdropStyles` — подложке: тот же `z-index`. Подложка стоит в DOM
 *   раньше панели, и панель рисуется поверх неё просто порядком.
 *
 * Имена переменных у каждого компонента свои — их читает CSS его блока
 * (`--dialog-width`, `--drawer-width`), — поэтому база абстрактна: наследник
 * называет их (`_variables`), а считает всё база. Второй копии расчёта у
 * окна и панели нет.
 *
 * Считает при установке и на смену ширины, высоты и слоя. Объекты
 * заменяются целиком, а не мутируются: геттер отдаёт ссылку наружу, и без
 * смены идентичности адаптер не увидит изменения.
 */
export abstract class TModalLayoutPlugin extends TBasePlugin<any, TModalLayoutPluginEvents> {
	/** Переменные размера, которые читает тема этого компонента. */
	protected abstract readonly _variables: TModalLayoutVariables

	private _styles: Record<string, string | number> = {}
	private _backdropStyles: Record<string, string | number> = {}
	private _owner: IModalLayer | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const owner = ctx.getInstance<IModalLayer>()

		if (!owner) return

		this._owner = owner

		const updateStyles = () => this._updateStyles()

		owner.events.on('change:width', updateStyles)
		owner.events.on('change:height', updateStyles)
		owner.events.on('change:zIndex', updateStyles)
		owner.events.on('change:zIndex', () => this._updateBackdropStyles())

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
		this._owner = null

		super.destroy()
	}

	private _updateStyles(): void {
		const owner = this._owner

		if (!owner) return

		const styles: Record<string, string | number> = { 'z-index': owner.zIndex }

		if (owner.width !== undefined) styles[this._variables.width] = toCssValue(owner.width)
		if (owner.height !== undefined) styles[this._variables.height] = toCssValue(owner.height)

		this._styles = styles
		this.events.emit('change:styles', this._styles)
	}

	private _updateBackdropStyles(): void {
		const owner = this._owner

		if (!owner) return

		this._backdropStyles = { 'z-index': owner.zIndex }
		this.events.emit('change:backdropStyles', this._backdropStyles)
	}
}
