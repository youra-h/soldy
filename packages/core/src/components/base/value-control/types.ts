import type { IControl, IControlProps, TControlEvents, TControlStates } from '../control'
import type { IStateUnit } from '../../../common'
import type { TValuePayload } from '../../../bridge'

export type TValueControlEvents<T> = TControlEvents & {
	/** changeValue */
	changeValue: (payload: TValuePayload<T>) => void
	/** inputValue (опционально) */
	inputValue: (payload: TValuePayload<T>) => void
	/** changeName */
	changeName: (value: string) => void
}

export interface IValueControlProps<TValue> extends IControlProps {
	value?: TValue
	name?: string
}

export type TValueControlStates<TValue> = TControlStates & {
	value: IStateUnit<TValue>
}

export interface IValueControl<
	TValue,
	TProps extends IValueControlProps<TValue> = IValueControlProps<TValue>,
	TEvents extends Record<string, (...args: any) => any> = TValueControlEvents<TValue>,
	TStates extends TValueControlStates<TValue> = TValueControlStates<TValue>,
> extends IControl<TProps, TEvents, TStates> {
	value: TValue
	name: string
}
