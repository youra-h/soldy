import type { TComponentSize, TComponentVariant } from '../../../bridge'
import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '../component-view'
import type { TComponentViewStates } from '../component-view'
import type { IStateUnit } from '../../../common'
import type { TValuePayload } from '../../../bridge'

export type TStylableEvents = TComponentViewEvents & {
	/** changeSize */
	changeSize: (payload: TValuePayload<TComponentSize>) => void
	/** changeVariant */
	changeVariant: (payload: TValuePayload<TComponentVariant>) => void
}

export interface IStylableProps extends IComponentViewProps {
	size?: TComponentSize
	variant?: TComponentVariant
}

export type TStylableStates = TComponentViewStates & {
	size: IStateUnit<TComponentSize>
	variant: IStateUnit<TComponentVariant>
}

export interface IStylable<
	TProps extends IStylableProps = IStylableProps,
	TEvents extends Record<string, (...args: any) => any> = TStylableEvents,
	TStates extends TStylableStates = TStylableStates,
> extends IComponentView<TProps, TEvents, TStates> {
	size: TComponentSize
	variant: TComponentVariant
}
