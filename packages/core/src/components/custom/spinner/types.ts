import type { IStylable, IStylableProps, TStylableEvents } from '../../base/stylable'

export interface ISpinnerProps extends IStylableProps {
	// Толщина бордера
	borderWidth?: number | 'auto'
}

export type TSpinnerEvents = TStylableEvents & {
	'change:borderWidth': (value: number | 'auto') => void
}

export interface ISpinner extends IStylable<ISpinnerProps, TSpinnerEvents> {
	/** Толщина бордера */
	borderWidth: number | 'auto'
}
