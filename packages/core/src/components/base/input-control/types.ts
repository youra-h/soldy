import type { IValueControl, IValueControlProps, TValueControlEvents } from '../value-control'

export type TInputControlEvents<T = string> = TValueControlEvents<T> & {
	'change:readonly': (value: boolean) => void
	'change:required': (value: boolean) => void
	'change:id': (value: string | undefined) => void
}

export interface IInputControlProps<T = string> extends IValueControlProps<T> {
	readonly?: boolean
	required?: boolean
	/**
	 * `id` элемента формы. Не задан — атрибута нет.
	 *
	 * Задают его там, где на поле ссылается разметка потребителя: `<label for>`,
	 * `aria-labelledby`. Сама библиотека на поле по `id` не ссылается: подпись
	 * `Label` оборачивает поле.
	 */
	id?: string
}

export interface IInputControl<
	T,
	TProps extends IInputControlProps<T> = IInputControlProps<T>,
	TEvents extends Record<string, (...args: any) => any> = TInputControlEvents<T>,
> extends IValueControl<T, TProps, TEvents> {
	readonly: boolean
	required: boolean
	/** `id` элемента формы; не задан — `undefined`. */
	id: string | undefined
}

// Backward-compatible aliases for the common text-input case
export type ITextInputControlProps = IInputControlProps<string>
export type ITextInputControl<
	TProps extends ITextInputControlProps = ITextInputControlProps,
	TEvents extends Record<string, (...args: any) => any> = TInputControlEvents<string>,
> = IInputControl<string, TProps, TEvents>
