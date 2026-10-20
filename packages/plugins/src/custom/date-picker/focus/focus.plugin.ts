import type { IDatePicker } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TDismissPlugin } from '../../dismiss'
import { TOverlayFocusPlugin } from '../../overlay/focus'
import type { IOverlayOpenOptions } from '../../overlay/types'
import { tabStops, trapTab } from '../../../utils'
import { firstPartOf } from '../field'
import type { TDatePickerFocusPluginEvents } from './types'

/**
 * TDatePickerFocusPlugin — модель фокуса панели DatePicker, APG Date Picker
 * Dialog.
 *
 * Общее с остальными оверлеями — запомнить, откуда открыли, увести фокус в
 * панель кадром позже, вернуть его при закрытии, закрыть по Escape — берёт у
 * `TOverlayFocusPlugin`. Своё у панели — смесь двух других моделей, поэтому
 * и стратегия своя, а не флаг в одной из них:
 *
 * **Tab замкнут в панели, как у модальной** (`trapTab`): панель — диалог с
 * `aria-modal`, фон спрятан от скринридера, и выйти из неё с клавиатуры можно
 * только закрыв — выбором, Escape или кнопкой календаря.
 *
 * **Нажатие мимо фокус отпускает, как у немодальной.** Подложки у панели нет,
 * и страница указателем остаётся рабочей: нажатие в соседнее поле закрывает
 * панель, а фокус остаётся там, куда нажали, — с первого нажатия. Поэтому на
 * `dismiss` плагин фокус не возвращает и `mousedown` этого нажатия не гасит,
 * в отличие от модального окна.
 *
 * **Первый фокус — день сетки**, а не первая кнопка календаря: остановка
 * сетки одна на все месяцы, и это день с фокусом коллекции — выбранная дата
 * или сегодня (`resetFocus` при открытии). Сетки нет в панели — фокус встаёт
 * на её первую остановку, как у любого оверлея.
 *
 * **Возврат — в поле.** Открыли с части поля (Alt+↓) — фокус возвращается
 * на неё. Открыли кнопкой календаря — на первую часть поля, у диапазона —
 * поля начала: кнопка местом возврата не считается (`_canReturnTo`). Туда
 * же, если фокус при открытии был на `body`: так бывает после нажатия кнопки
 * в Safari, где кнопка по нажатию фокус не получает, и фокус потерялся бы
 * после выбора. APG возвращает фокус на кнопку; здесь — как у нативного
 * `<input type="date">`, где кнопка календаря — часть поля: после выбора
 * дату можно сразу поправить с клавиатуры. Часть поля плагин узнаёт по
 * классу части (`__segment`) экземпляра поля DatePicker, как кнопку — по
 * `__trigger`, а не строкой.
 */
export class TDatePickerFocusPlugin extends TOverlayFocusPlugin<TDatePickerFocusPluginEvents> {
	private _owner: IDatePicker | null = null

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		this._owner = ctx.getInstance<IDatePicker>() ?? null

		// Приходит до закрытия (`TDismissPlugin` сообщает, потом закрывает)
		ctx.get(TDismissPlugin)?.events.on('dismiss', () => {
			this._restore = false
		})
	}

	override destroy(): void {
		this._owner = null

		super.destroy()
	}

	/** Tab по кругу внутри панели. */
	protected override _onTab(event: KeyboardEvent): void {
		if (this._panel) trapTab(event, this._panel)
	}

	/** Остановка сетки календаря — первой, перед остановками панели по порядку. */
	protected override _focusCandidates(panel: Element): readonly Element[] {
		const grid = this._owner?.calendar.classes.resolve('__grid', { point: true })
		const days = grid ? [...panel.querySelectorAll(grid)].flatMap((node) => tabStops(node)) : []

		return [...days, ...super._focusCandidates(panel)]
	}

	/** Кнопка календаря в корне местом возврата не считается: фокус — в поле. */
	protected override _canReturnTo(element: Element, root: Element): boolean {
		const trigger = this._owner?.classes.resolve('__trigger', { point: true })
		const button = trigger ? element.closest(trigger) : null

		return !button || !root.contains(button)
	}

	/**
	 * Запомненного элемента нет или это кнопка календаря — фокус на первую часть
	 * поля, у диапазона — поля начала (`firstPartOf`): туда же его ставит запись
	 * `focused = true`.
	 */
	protected override _returnCandidates(root: Element): readonly Element[] {
		const part = this._owner ? firstPartOf(this._owner, root) : null

		return part ? [part] : []
	}
}
