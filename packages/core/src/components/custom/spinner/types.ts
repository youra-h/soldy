import type {
	IStylable,
	IStylableProps,
	TStylableEvents,
	TStylableStates,
} from '../../base/stylable'

export interface ISpinnerProps extends IStylableProps {
	// Толщина бордера
	borderWidth?: number | 'auto'
}

export type TSpinnerStates = TStylableStates

export type TSpinnerEvents = TStylableEvents & {
	'change:borderWidth': (value: number | 'auto') => void
}

export interface ISpinner extends IStylable<ISpinnerProps, TSpinnerEvents, TSpinnerStates> {
	/** Толщина кольца как задана: пиксели или `'auto'` — по размеру */
	borderWidth: number | 'auto'
	/** Итоговая толщина кольца в пикселях: при `'auto'` посчитана по размеру */
	readonly borderWidthResolved: number
}
