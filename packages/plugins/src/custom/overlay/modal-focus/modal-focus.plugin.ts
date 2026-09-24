import { focusFirst, tabStops } from '../../../utils'
import { TOverlayFocusPlugin } from '../focus'

/**
 * TModalFocusPlugin — модель фокуса модального оверлея: диалога, выезжающей
 * панели, всего, что перехватывает работу со страницей.
 *
 * Общее с немодальным — запомнить, откуда открыли, увести фокус в панель,
 * вернуть при закрытии, закрыться по Escape — берёт у `TOverlayFocusPlugin`.
 * Своего здесь две вещи, и обе следуют из модальности:
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
}
