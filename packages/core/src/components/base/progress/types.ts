import type { IStylable, IStylableProps, TStylableEvents } from '../stylable'

export interface IProgressProps extends IStylableProps {
	/** Сколько готово — число на шкале от `min` до `max` */
	value?: number
	/** Начало шкалы */
	min?: number
	/** Конец шкалы */
	max?: number
	/**
	 * Доля неизвестна — индикатор бежит. Флаг главнее значения, как у
	 * CheckBox: пока он стоит, доли и `aria-valuenow` нет, а `value` хранится
	 * и вернётся, когда бег снимут.
	 */
	indeterminate?: boolean
}

export type TProgressEvents = TStylableEvents & {
	/** change:value */
	'change:value': (value: number) => void
	/** change:min */
	'change:min': (value: number) => void
	/** change:max */
	'change:max': (value: number) => void
	/** change:indeterminate */
	'change:indeterminate': (value: boolean) => void
}

export interface IProgress<
	TProps extends IProgressProps = IProgressProps,
	TEvents extends Record<string, (...args: any) => any> = TProgressEvents,
> extends IStylable<TProps, TEvents> {
	/** Сколько готово */
	value: number
	/** Начало шкалы */
	min: number
	/** Конец шкалы */
	max: number
	/** Доля неизвестна — индикатор бежит, `value` при этом хранится */
	indeterminate: boolean
}
