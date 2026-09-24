import type { IPluginContext } from '../../../base'
import { TDismissPlugin } from '../../dismiss'
import { focusFirst, tabStops } from '../../../utils'
import { TOverlayFocusPlugin } from '../focus'
import type { IOverlayOpenOptions } from '../types'

/** Что снимает ожидание `mousedown` нажатия мимо: оно кончилось без него. */
const PRESS_END = ['click', 'pointercancel'] as const

/**
 * TModalFocusPlugin — модель фокуса модального оверлея: диалога, выезжающей
 * панели, всего, что перехватывает работу со страницей.
 *
 * Общее с немодальным — запомнить, откуда открыли, увести фокус в панель,
 * вернуть при закрытии, закрыться по Escape — берёт у `TOverlayFocusPlugin`.
 * Своего здесь три вещи, и все следуют из модальности:
 *
 * **Tab замкнут в панели.** С последней остановки он ведёт на первую, а
 * Shift+Tab с первой — на последнюю. Панели без единой остановки внутри
 * держат фокус на ней самой (`tabindex="-1"`), и Tab с неё никуда не уводит:
 * модальное окно тем и модально, что выйти из него можно только закрыв.
 * Порядок остановок внутри панели ведёт браузер — плагин вмешивается только
 * на краях.
 *
 * **Возвращать фокус некуда, кроме запомненного элемента.** Триггера у
 * модального окна не бывает: открыть его может и кнопка на другом конце
 * страницы, и код без всякого нажатия. Поэтому запасного `_returnCandidates`
 * у него нет: пропал запомненный элемент — фокус остаётся там, где его
 * оставил браузер.
 *
 * **Нажатие мимо фокус не забирает.** Фокус возвращается при любом
 * закрытии, и нажатием мимо тоже: страница за окном недоступна, и
 * пользователь не «уже там, куда нажал», как у немодального. Но окно
 * закрывается ещё на нажатии (`pointerdown`), а фокус переносит действие по
 * умолчанию у `mousedown`, который приходит следом: нажатие по подложке
 * унесло бы возвращённый фокус на `body`. А если окно не закрылось
 * (`dismissible: false`), фокус ушёл бы с окна, и Tab с `body` повёл бы на
 * страницу за ним. Поэтому на `dismiss` плагин гасит действие по умолчанию у
 * `mousedown` этого нажатия: у самого события, если нажатие решил он (перо
 * графического планшета), иначе — у ближайшего следующего. Ожидание снимают
 * `click` и `pointercancel`: нажатие кончилось без `mousedown`.
 *
 * Панель — узел с пометкой владельца (`TDismissPlugin.ownerAttribute`), а
 * если пометки нет или `TDismissPlugin` не поставлен, панель и есть корень:
 * у модального окна корень телепортирован целиком, и держать в странице
 * нечего. Тогда и слушатель клавиш на нём один.
 *
 * Чего плагин не делает: `aria-modal` пишет в свой набор ядро компонента —
 * это значение, а не операция; фон от скринридера не прячет — это
 * `THideOutsidePlugin` (пометкой `aria-hidden`, а не `inert`: при закрытии
 * модель фокуса возвращает фокус в фон, и под `inert` он бы не вернулся);
 * прокрутку не запирает — это `TScrollLockPlugin`.
 */
export class TModalFocusPlugin extends TOverlayFocusPlugin {
	/** Документ, где плагин ждёт `mousedown` нажатия мимо; `null` — не ждёт. */
	private _pressDocument: Document | null = null

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		ctx.get(TDismissPlugin)?.events.on('dismiss', (event) => this._keepFocus(event))
	}

	override destroy(): void {
		this._stopWaiting()

		super.destroy()
	}

	/** У модального оверлея панель и есть корень: телепортирован он целиком. */
	protected override _panelFallback(root: Element): Element | null {
		return root
	}

	/** Tab по кругу внутри панели; за её пределы фокус не выходит. */
	protected override _onTab(event: KeyboardEvent): void {
		const panel = this._panel
		const active = panel?.ownerDocument.activeElement

		if (!panel || !active) return

		// Фокус увели из панели мимо плагина (`focus()` со стороны) — вернуть
		// его в неё, а не гадать, откуда он ушёл
		if (!panel.contains(active)) {
			if (focusFirst([...tabStops(panel), panel])) event.preventDefault()

			return
		}

		const stops = tabStops(panel)

		// Фокусировать внутри нечего: панель держит его сама, и Tab с неё
		// никуда не ведёт
		if (stops.length === 0) {
			event.preventDefault()

			return
		}

		const edge = event.shiftKey ? stops[0] : stops[stops.length - 1]

		// Не край панели — порядок ведёт браузер
		if (active !== edge && active !== panel) return

		const wrapped = event.shiftKey ? [...stops].reverse() : stops

		if (focusFirst(wrapped)) event.preventDefault()
	}

	/**
	 * Нажатие мимо: погасить `mousedown`, который унёс бы фокус (см. шапку).
	 * Уход фокуса мимо (`focusin`) гасить нечем — фокус уже ушёл, а модальному
	 * окну `focusOutside` и не ставят: фокус из него не уходит.
	 */
	private _keepFocus(event: MouseEvent | FocusEvent): void {
		if (event.type === 'mousedown') {
			event.preventDefault()

			return
		}

		if (event.type === 'focusin') return

		const doc = this._root?.ownerDocument

		if (doc) this._waitMouseDown(doc)
	}

	/**
	 * Ждать `mousedown` этого нажатия. Слушатели — на документе в фазе
	 * перехвата, как у `TDismissPlugin`: подложку и то, что под ней, плагин не
	 * знает, а до документа событие не остановит никто.
	 */
	private _waitMouseDown(doc: Document): void {
		this._stopWaiting()

		doc.addEventListener('mousedown', this._onMouseDown, true)

		for (const type of PRESS_END) doc.addEventListener(type, this._stopWaiting, true)

		this._pressDocument = doc
	}

	private readonly _onMouseDown = (event: MouseEvent): void => {
		event.preventDefault()
		this._stopWaiting()
	}

	private readonly _stopWaiting = (): void => {
		const doc = this._pressDocument

		if (!doc) return

		doc.removeEventListener('mousedown', this._onMouseDown, true)

		for (const type of PRESS_END) doc.removeEventListener(type, this._stopWaiting, true)

		this._pressDocument = null
	}
}
