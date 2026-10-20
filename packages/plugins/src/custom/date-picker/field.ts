import type { IDatePicker } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'

/**
 * Первая часть поля в корне DatePicker: у одной даты — поля `field`, у
 * диапазона — поля начала `start`, оно стоит в корне раньше поля конца.
 * `null` — части в корне нет.
 *
 * Одна на модель фокуса панели (куда вернуть фокус, когда открыли кнопкой
 * календаря) и узел фокуса DatePicker (`fieldSegmentOf`): поле оба ищут одним
 * правилом. Часть находят по классу экземпляра поля (`classes.resolve`), а не
 * строкой.
 */
export function firstPartOf(owner: IDatePicker, root: Element): Element | null {
	const field = owner.mode === 'range' ? owner.start : owner.field

	return root.querySelector(field.classes.resolve('__segment', { point: true }))
}

/**
 * Узел фокуса DatePicker (`focusTarget` плагина действия) — первая часть
 * поля, у диапазона — поля начала: запись `focused = true` ставит фокус туда
 * же, куда его возвращает панель, а не на коробку корня. `null` — инстанса или
 * части в корне нет.
 */
export function fieldSegmentOf(root: Element, ctx: IPluginContext): Element | null {
	const owner = ctx.getInstance<IDatePicker>()

	return owner ? firstPartOf(owner, root) : null
}
