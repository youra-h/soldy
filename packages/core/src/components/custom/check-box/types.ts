import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'
import type { TThemeRegistry } from '../../../common'

/**
 * Реестр видов чекбокса. Значения объявляет тема (см. `TThemeRegistry`).
 *
 * Раньше на этом месте был булев `plain`: флаг не давал теме ни добавить
 * второй вид, ни отказаться от первого.
 */
export interface ICheckBoxViews extends TThemeRegistry {}

export type TCheckBoxView = Extract<keyof ICheckBoxViews, string>

export interface ICheckBoxProps extends IInputControlProps<boolean | undefined> {
	// value наследуется от IInputControlProps<boolean | undefined>
	// Отображать ли состояние "не определено"
	indeterminate?: boolean
	/** Вид чекбокса. Не задан — модификатора нет, чекбокс выглядит видом темы по умолчанию */
	view?: TCheckBoxView
}

export type TCheckBoxEvents = TInputControlEvents<boolean | undefined> & {
	'change:indeterminate': (value: boolean) => void
	'change:view': (value: TCheckBoxView | undefined) => void
}

export interface ICheckBox extends IInputControl<
	boolean | undefined,
	ICheckBoxProps,
	TCheckBoxEvents
> {
	/** Состояние "не определено" */
	indeterminate: boolean
	/** Вид чекбокса */
	view: TCheckBoxView | undefined
	/** Переключает состояние чекбокса */
	toggle(): void
}
