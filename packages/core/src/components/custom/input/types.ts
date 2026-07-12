import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'

export interface IInputProps extends IInputControlProps<string> {
	placeholder?: string
}

export type TInputEvents = TInputControlEvents<string> & {
	changePlaceholder: (value: string) => void
}

export interface IInput extends IInputControl<string, IInputProps, TInputEvents> {
	placeholder: string
}
