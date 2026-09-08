import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../value-control'

export type TInputControlEvents<T = string> = TValueControlEvents<T> & {
	'change:readonly': (value: boolean) => void
	'change:required': (value: boolean) => void
	'change:id': (value: string) => void
}

export interface IInputControlProps<T = string> extends IValueControlProps<T> {
	readonly?: boolean
	required?: boolean
	/**
	 * `id` элемента формы. Пусто — берётся `uid`.
	 *
	 * Нужен снаружи, потому что на него ссылаются: `<label for>`,
	 * `aria-labelledby`, `aria-describedby` у сообщения об ошибке. Без него
	 * потребитель не может связать поле с подписью, а `uid` он не знает.
	 */
	id?: string
}

export type TInputControlStates<TValue = string> = TValueControlStates<TValue>

export interface IInputControl<
	T,
	TProps extends IInputControlProps<T> = IInputControlProps<T>,
	TEvents extends Record<string, (...args: any) => any> = TInputControlEvents<T>,
> extends IValueControl<T, TProps, TEvents> {
	readonly: boolean
	required: boolean
	/** `id` элемента формы: заданный снаружи либо производный от `uid`. */
	id: string
}

// Backward-compatible aliases for the common text-input case
export type ITextInputControlProps = IInputControlProps<string>
export type ITextInputControl<
	TProps extends ITextInputControlProps = ITextInputControlProps,
	TEvents extends Record<string, (...args: any) => any> = TInputControlEvents<string>,
> = IInputControl<string, TProps, TEvents>
