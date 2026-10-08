import type { IInputControl, IInputControlProps, TInputControlEvents } from '../input-control'
import type { TAria, TAriaAttributes } from '../../../common'

export interface IFieldProps<T = string> extends IInputControlProps<T> {
	/** Показывать ли кнопку очистки значения */
	clearable?: boolean
}

export type TFieldEvents<T = string> = TInputControlEvents<T> & {
	/** change:clearable */
	'change:clearable': (value: boolean) => void
	/** change:clearAria — набор атрибутов кнопки очистки изменился */
	'change:clearAria': (value: TAriaAttributes) => void
	/**
	 * clear — поле очистили (`clear`): шаг очистки поля уже сделан. Приходит
	 * всегда, даже у пустого поля: владелец поля очищает своё — Select снимает
	 * выбор, хотя в `multiple` его поле пусто и при выбранных тегах.
	 */
	clear: () => void
}

export interface IField<
	T,
	TProps extends IFieldProps<T> = IFieldProps<T>,
	TEvents extends Record<string, (...args: any) => any> = TFieldEvents<T>,
> extends IInputControl<T, TProps, TEvents> {
	/** Показывать ли кнопку очистки значения */
	clearable: boolean
	/** Атрибуты кнопки очистки: имя с именем поля от локали пишет плагин имён */
	readonly clearAria: TAria
	/**
	 * Очистить поле и сообщить об этом событием `clear`. Привязана к
	 * инстансу: разметка отдаёт её в scope слота `clear`, и своя кнопка зовёт
	 * её голой функцией.
	 */
	readonly clear: () => void
}
