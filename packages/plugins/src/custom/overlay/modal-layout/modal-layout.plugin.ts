import type { IModalLayer, TEventSink } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { toCssValue } from '../../../utils'
import type { TModalLayoutPluginEvents, TModalLayoutVariables } from './types'

/**
 * Одни ли и те же стили: те же ключи с теми же значениями. Порядок ключей не
 * важен — это набор свойств, а не список.
 */
function sameStyles(
	a: Record<string, string | number>,
	b: Record<string, string | number>,
): boolean {
	const keys = Object.keys(a)

	return keys.length === Object.keys(b).length && keys.every((key) => b[key] === a[key])
}

/**
 * Раскладка модального слоя — общая часть окна и выезжающей панели: слой и
 * размер в объекты стилей для разметки.
 *
 * Модальный слой ничего не меряет и координат не считает: место, край,
 * разворот и анимацию раскладывает тема по модификаторам и `data-*`. Плагину
 * остаются значения, которые в класс не уложить:
 *
 * - `styles` — панели: `z-index` слоя, размер и свои переменные наследника
 *   (`_panelVariables`: у окна — отступы от краёв экрана). Переменными, а не
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
 * Считает при установке и на смену ширины, высоты и слоя; на смену своих
 * значений наследник зовёт тот же пересчёт (`_updateStyles`). Объекты
 * заменяются целиком, а не мутируются: геттер отдаёт ссылку наружу, и без
 * смены идентичности адаптер не увидит изменения. `change:styles` — только
 * когда стили сменились по содержимому: повод пересчёта не всегда их меняет.
 *
 * Дженерик по карте событий — для наследника со своими событиями
 * (`offset:before` у окна); свои события база шлёт через `_sink`.
 */
export abstract class TModalLayoutPlugin<
	TEvents extends TModalLayoutPluginEvents = TModalLayoutPluginEvents,
> extends TBasePlugin<any, TEvents> {
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

		this._listenTo(owner.events, 'change:width', updateStyles)
		this._listenTo(owner.events, 'change:height', updateStyles)
		this._listenTo(owner.events, 'change:zIndex', updateStyles)
		this._listenTo(owner.events, 'change:zIndex', () => this._updateBackdropStyles())

		this._updateStyles()
		this._updateBackdropStyles()
	}

	/** Стили панели: `z-index` слоя, переменные размера и свои переменные наследника. */
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

	/**
	 * Эмит собственных событий раскладки — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `@soldy-ui/core`): карта — дженерик,
	 * а `change:styles` и `change:backdropStyles` объявлены здесь.
	 */
	protected override get _sink(): TEventSink<TModalLayoutPluginEvents> {
		return this.events
	}

	/**
	 * Свои переменные панели сверх размера: имя переменной → CSS-значение.
	 * Их читает каждый пересчёт стилей, начиная с установки, поэтому то, из
	 * чего они строятся, наследник обязан знать уже тогда. По умолчанию своих
	 * нет.
	 */
	protected _panelVariables(): Record<string, string> {
		return {}
	}

	/**
	 * Пересчитать стили панели. Наследник зовёт его на смену значений, из
	 * которых строит `_panelVariables`.
	 */
	protected _updateStyles(): void {
		const owner = this._owner

		if (!owner) return

		const styles: Record<string, string | number> = { 'z-index': owner.zIndex }

		if (owner.width !== undefined) styles[this._variables.width] = toCssValue(owner.width)
		if (owner.height !== undefined) styles[this._variables.height] = toCssValue(owner.height)

		Object.assign(styles, this._panelVariables())

		if (sameStyles(styles, this._styles)) return

		this._styles = styles
		this._sink.emit('change:styles', this._styles)
	}

	private _updateBackdropStyles(): void {
		const owner = this._owner

		if (!owner) return

		this._backdropStyles = { 'z-index': owner.zIndex }
		this._sink.emit('change:backdropStyles', this._backdropStyles)
	}
}
