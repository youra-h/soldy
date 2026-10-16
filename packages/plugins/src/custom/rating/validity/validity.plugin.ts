import type { IRating } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import type { ILocaleSource } from '../../../locale/types'
import { TElementPlugin } from '../../element'
import { fieldOf, thumbsOf, trackOf } from '../../slide/parts'
import type { TRatingValidityPluginEvents } from './types'

/**
 * TRatingValidityPlugin — обязательная оценка: пока её нет, форма не
 * отправляется.
 *
 * 0 у оценки значит «оценки нет», и обязательная оценка с 0 — то же, что
 * пустое поле с `required`. Но поле оценки — `input[type=range]`: ни
 * `required`, ни состояния «пусто» у него нет, у ползунка значение есть
 * всегда. Поэтому ошибку полю ставит плагин — `setCustomValidity` со строкой
 * локали `rating.required`, пока оценка обязательна, не только для показа и
 * равна 0, — и снимает, когда условие ушло. Остальное делает браузер, как с
 * любым неверным полем: не отправляет форму, ставит фокус на поле и
 * показывает сообщение, а `disabled` из проверки исключает сам.
 *
 * Только для показа (`readonly`) ошибки нет, как у нативного поля `readonly`:
 * его браузер тоже не проверяет. Свойства «неверно» у ядра нет: когда
 * показывать ошибку, решает браузер, — до первой отправки нетронутая оценка
 * не горит, — и тема красит её по `:user-invalid` поля.
 *
 * Пересчёт — на появление узла, смену оценки, обязательности, режима только
 * для показа и локали. Без узла плагин ничего не делает: сборка идёт и на
 * сервере, а поле, которому ставить ошибку, появится с `ready`. Отпустил узел
 * или снят сам — ошибку с поля снимает: ставил её он.
 */
export class TRatingValidityPlugin extends TBasePlugin<IRating, TRatingValidityPluginEvents> {
	private _owner: IRating | null = null
	/** Источник локали набора — за строкой ошибки на её языке */
	private _locale: ILocaleSource | null = null
	/** Корень оценки, пока узел объявлен: поле плагин находит в нём */
	private _root: Element | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<IRating>()

		if (!owner) return

		this._owner = owner
		this._locale = ctx.locale

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (root) => this._attach(root))
		element?.events.on('removed', () => this._detach())

		const sync = (): void => this._sync()

		this._listenTo(owner.events, 'change:value', sync)
		this._listenTo(owner.events, 'change:required', sync)
		this._listenTo(owner.events, 'change:readonly', sync)
		this._listenTo(ctx.locale.events, 'change', sync)
	}

	override destroy(): void {
		this._detach()
		this._owner = null
		this._locale = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		this._root = root
		this._sync()
	}

	private _detach(): void {
		this._field()?.setCustomValidity('')
		this._root = null
	}

	/** Ошибка полю — по текущей оценке; оценки нет только у обязательной. */
	private _sync(): void {
		const owner = this._owner
		const field = this._field()

		if (!owner || !field) return

		field.setCustomValidity(this._missing(owner) ? this._message() : '')
	}

	/**
	 * Обязательной оценки нет: она равна 0 и её можно поставить. Только для
	 * показа её не ставят вовсе, и спрашивать её с пользователя нечего.
	 */
	private _missing(owner: IRating): boolean {
		return owner.required && !owner.readonly && owner.value === 0
	}

	private _message(): string {
		return this._locale?.locale.translations.rating.required ?? ''
	}

	/** Поле — у единственной ручки оценки, её `input`; узла нет — и поля нет. */
	private _field(): HTMLInputElement | null {
		const owner = this._owner
		const root = this._root

		if (!owner || !root) return null

		const track = trackOf(owner, root)

		return track ? fieldOf(thumbsOf(owner, track)[0]) : null
	}
}
