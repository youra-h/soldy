import type { IControl, IControlProps, TControlEvents } from '../control'
import type { TChangeEvent, TValuePayload } from '../../../common'

export type TValueControlEvents<T> = TControlEvents & {
	/** change:value */
	'change:value': (payload: TValuePayload<T>) => void
	/** Запись своего `value` — подправить или отменить (`TChangeEvent`) */
	'change:value:before': (e: TChangeEvent<T>) => void
	/** input:value (опционально) */
	'input:value': (payload: TValuePayload<T>) => void
	input: (payload: TValuePayload<T>) => void
	/** change:name */
	'change:name': (value: string) => void
}

export interface IValueControlProps<TValue> extends IControlProps {
	value?: TValue
	name?: string
}

export interface IValueControl<
	TValue,
	TProps extends IValueControlProps<TValue> = IValueControlProps<TValue>,
	TEvents extends Record<string, (...args: any) => any> = TValueControlEvents<TValue>,
> extends IControl<TProps, TEvents> {
	value: TValue
	name: string
}
