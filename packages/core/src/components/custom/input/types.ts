import type { IField, IFieldProps, TFieldEvents } from '../../base/field'

export interface IInputProps extends IFieldProps<string> {
	placeholder?: string
}

export type TInputEvents = TFieldEvents<string> & {
	'change:placeholder': (value: string) => void
}

export interface IInput extends IField<string, IInputProps, TInputEvents> {
	placeholder: string
}
