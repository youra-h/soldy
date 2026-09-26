import { TActionEvent } from '@soldy-ui/core'
import type { TDialogPlacement } from '@soldy-ui/core'

/**
 * Отступы окна от краёв экрана перед раскладкой — аргумент `offset:before`
 * (`layout:offset:before` у компонента).
 *
 * Проп `offset` задаёт один отступ на все стороны, а подписчик правит их по
 * отдельности — например, сверху отступает больше, чем снизу, — как
 * подписчик `item:add:before` правит данные вставки (`TInsertEvent`). Стороны
 * логические, как место окна: `start` и `end` в RTL меняются местами сами.
 * Значение стороны — то же, что у пропа: число — px, строка — CSS-значение,
 * `0` — вплотную, `undefined` — отступ темы. `preventDefault()` отменяет
 * отступы целиком: все стороны — от темы.
 *
 * Событие приходит на каждый пересчёт стилей окна, и каждый раз стороны
 * заново берутся из `offset`: поправку подписчик вносит всякий раз, а не
 * однажды.
 */
export class TDialogOffsetEvent extends TActionEvent {
	/** Отступ от верхнего края экрана. */
	top: number | string | undefined
	/** Отступ от нижнего края экрана. */
	bottom: number | string | undefined
	/** Отступ от начала строки: от левого края, в RTL — от правого. */
	start: number | string | undefined
	/** Отступ от конца строки: от правого края, в RTL — от левого. */
	end: number | string | undefined

	/**
	 * @param placement где стоит окно: по нему подписчик решает, какую
	 *   сторону править
	 * @param offset отступ из пропа — начальное значение всех четырёх сторон
	 */
	constructor(
		readonly placement: TDialogPlacement,
		offset: number | string | undefined,
	) {
		super()

		this.top = offset
		this.bottom = offset
		this.start = offset
		this.end = offset
	}
}
