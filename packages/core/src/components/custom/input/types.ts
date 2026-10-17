import type { IClearable, IClearableProps, TClearableEvents } from '../../base/clearable'

export interface IInputProps extends IClearableProps<string> {
	placeholder?: string
}

export type TInputEvents = TClearableEvents<string> & {
	'change:placeholder': (value: string) => void
}

export interface IInput extends IClearable<string, IInputProps, TInputEvents> {
	placeholder: string
}
