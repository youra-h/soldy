import { TBasePlugin } from '../../base'
import type { TElementServiceEvents } from './types'

/**
 * TElementPlugin — DOM-узел компонента для остальных плагинов.
 *
 * Адаптер передаёт узел как есть, при каждой смене. Контракт событий
 * (`TElementServiceEvents`) держит сам плагин, а не шесть адаптеров: одно
 * `ready` на подключение, `removed` только после `ready`, замена узла — пара
 * `removed` + `ready`.
 *
 * Объявление узла откладывается на кадр, и отложенное объявление всегда одно:
 * каждая смена узла отменяет предыдущее. По нему же видно, объявлен ли
 * текущий узел: узел есть, а объявление кадра не ждёт. Отдельного флага нет,
 * чтобы у одного факта не было двух источников.
 *
 * Объявление узла — только событие: промиса ожидания у плагина нет. Ждать
 * узел — подпиской на `ready`; готовность компоненту отдаёт `TReadyPlugin`
 * через `IComponentView.ready`.
 *
 * Узел объявлен как `Element`, а не `HTMLElement`: `tag` — свободный проп, и
 * корнем компонента бывает `svg`. Плагину, которому нужна HTML-специфика,
 * узел сужает тип-гард из `utils` (`isMeasurableElement`,
 * `isFocusableElement`), а не приведение.
 */
export class TElementPlugin extends TBasePlugin<any, TElementServiceEvents> {
	private _element: Element | null = null
	/** Кадр с отложенным объявлением узла; `null` — объявлять нечего. */
	private _announceFrame: number | null = null

	get element(): Element | null {
		return this._element
	}

	set element(el: Element | null) {
		if (this._element === el) return

		const announced = this._element !== null && this._announceFrame === null

		this._cancelAnnounce()
		this._element = el

		if (announced) this.events.emit('removed')

		if (el) this._announce(el)
	}

	override destroy(): void {
		// База подписчиков не снимает: без отмены кадр объявил бы узел уже
		// после уничтожения
		this._cancelAnnounce()

		super.destroy()
	}

	/** Объявляет узел через кадр. Смена узла до кадра объявление отменяет. */
	private _announce(el: Element): void {
		this._announceFrame = requestAnimationFrame(() => {
			this._announceFrame = null

			this.events.emit('ready', el)
		})
	}

	private _cancelAnnounce(): void {
		if (this._announceFrame === null) return

		cancelAnimationFrame(this._announceFrame)
		this._announceFrame = null
	}
}
