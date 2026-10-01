import type {
	TChangeEvent,
	TComponentSize,
	TComponentVariant,
	TValuePayload,
} from '../../../common'
import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '../component-view'

export type TStylableEvents = TComponentViewEvents & {
	/** change:size */
	'change:size': (payload: TValuePayload<TComponentSize>) => void
	/** Запись своего `size` — подправить или отменить (`TChangeEvent`) */
	'change:size:before': (e: TChangeEvent<TComponentSize>) => void
	/** change:variant */
	'change:variant': (payload: TValuePayload<TComponentVariant | undefined>) => void
	/** Запись своего `variant` — подправить или отменить (`TChangeEvent`) */
	'change:variant:before': (e: TChangeEvent<TComponentVariant | undefined>) => void
}

export interface IStylableProps extends IComponentViewProps {
	size?: TComponentSize
	/** Вариант темы. Не задан — модификатора нет, компонент выглядит вариантом темы по умолчанию */
	variant?: TComponentVariant
}

export interface IStylable<
	TProps extends IStylableProps = IStylableProps,
	TEvents extends Record<string, (...args: any) => any> = TStylableEvents,
> extends IComponentView<TProps, TEvents> {
	size: TComponentSize
	variant: TComponentVariant | undefined
}
