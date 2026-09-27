import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../../base/control'
import type { IStateUnit, TCalendarDate } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'

export type TCalendarItemEvents = TControlEvents & {
	/** change:date */
	'change:date': (value: TCalendarDate) => void
	/** change:text */
	'change:text': (value: string) => void
	/** Сменился итог «недоступен» — своё значение или правило календаря */
	'change:unavailable': (value: boolean) => void
}

export interface ICalendarItemProps extends IControlProps {
	/** Дата дня */
	date?: TCalendarDate
	/** Номер дня в цифрах локали — текст ячейки */
	text?: string
	/**
	 * День недоступен: фокус на него встаёт, выбрать нельзя. Итог — своё
	 * значение или правило календаря (`unavailable` владельца)
	 */
	unavailable?: boolean
}

export type TCalendarItemStates = TControlStates & {
	unavailable: IStateUnit<boolean>
}

export interface ICalendarItem<
	TProps extends ICalendarItemProps = ICalendarItemProps,
	TEvents extends TCalendarItemEvents = TCalendarItemEvents,
	TStates extends TCalendarItemStates = TCalendarItemStates,
> extends IControl<TProps, TEvents, TStates> {
	/** Дата дня */
	date: TCalendarDate
	/** Номер дня в цифрах локали */
	text: string
	/** Недоступен: фокус встаёт, выбор — нет */
	unavailable: boolean
}

export type TCalendarItemOptions = IComponentOptions<TCalendarItemStates>
