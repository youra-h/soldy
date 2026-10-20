import type { ICalendar, TCalendarCollection } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import { TCollectionElements } from '../collection'
import { dayElementOf, pickerListOf, pickerPanelOf } from './parts'

/**
 * Остановка календаря — узел фокуса Calendar (`focusTarget` плагина
 * действия): запись `focused = true` ставит фокус туда же, куда ведёт Tab.
 *
 * Все сетки — одна остановка, день с фокусом коллекции (`focusedDate`), и
 * узел дня — тот же, на который фокус переносит клавиатура календаря
 * (`dayElementOf`). День берётся по модели, а не по `[tabindex="0"]`: в такте
 * смены фокуса коллекции разметка ещё старая, и фокус ушёл бы на прежний день.
 * Пока открыта панель выбора месяца и года, сетка под её подложкой, а
 * остановка — список панели (`pickerListOf`), как у стрелки панели, погасшей
 * под фокусом.
 *
 * `null` — узла нет в документе: день нового месяца в такте листания ещё не
 * нарисован, содержимое панели не смонтировано до первого открытия. День
 * запись `focused` дождётся: его узел приносит элемент коллекции календаря, и
 * плагин действия зовёт правило снова. Список панели — нет: он не элемент
 * этой коллекции, и о его узле календарь не узнаёт.
 */
export function gridStopOf(root: Element, ctx: IPluginContext): Element | null {
	const owner = ctx.getInstance<ICalendar>()
	const elements = ctx.get(TCollectionElements) ?? null
	// Движок приходит к плагинам без типа, как `engine:bound` клавиатуре календаря
	const engine: TCalendarCollection | null = elements?.engine ?? null

	if (!owner || !engine) return null

	const picker = engine.extensions.picker.pickers.find((place) => place.popover.open)

	if (picker) return pickerListOf(owner, pickerPanelOf(owner, root, picker))

	return dayElementOf(engine, elements, engine.extensions.focus.focusedDate)
}
