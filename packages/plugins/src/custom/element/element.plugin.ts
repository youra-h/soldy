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
 */
export class TElementPlugin extends TBasePlugin<any, TElementServiceEvents> {
	private _element: HTMLElement | null = null
	/** Кадр с отложенным объявлением узла; `null` — объявлять нечего. */
	private _announceFrame: number | null = null
	private _readyResolve: ((el: HTMLElement) => void) | null = null

	get element(): HTMLElement | null {
		return this._element
	}

	set element(el: HTMLElement | null) {
		if (this._element === el) return

		const announced = this._element !== null && this._announceFrame === null

		this._cancelAnnounce()
		this._element = el

		if (announced) this.events.emit('removed')

		if (el) this._announce(el)
	}

	ready(): Promise<HTMLElement> {
		if (this._element) return Promise.resolve(this._element)

		return new Promise<HTMLElement>((resolve) => {
			this._readyResolve = resolve
		})
	}

	override destroy(): void {
		// База подписчиков не снимает: без отмены кадр объявил бы узел уже
		// после уничтожения
		this._cancelAnnounce()

		super.destroy()
	}

	/** Объявляет узел через кадр. Смена узла до кадра объявление отменяет. */
	private _announce(el: HTMLElement): void {
		this._announceFrame = requestAnimationFrame(() => {
			this._announceFrame = null

			this._readyResolve?.(el)
			this._readyResolve = null

			this.events.emit('ready', el)
		})
	}

	private _cancelAnnounce(): void {
		if (this._announceFrame === null) return

		cancelAnimationFrame(this._announceFrame)
		this._announceFrame = null
	}
}
