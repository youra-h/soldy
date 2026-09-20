import type { IStateUnit, TComponentSize, TComponentVariant, TValuePayload } from '../../../common'
import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '../component-view'
import type { TComponentViewStates } from '../component-view'

export type TStylableEvents = TComponentViewEvents & {
	/** change:size */
	'change:size': (payload: TValuePayload<TComponentSize>) => void
	/** change:variant */
	'change:variant': (payload: TValuePayload<TComponentVariant | undefined>) => void
}

export interface IStylableProps extends IComponentViewProps {
	size?: TComponentSize
	/** Вариант темы. Не задан — модификатора нет, компонент выглядит вариантом темы по умолчанию */
	variant?: TComponentVariant
}

export type TStylableStates = TComponentViewStates & {
	size: IStateUnit<TComponentSize>
	variant: IStateUnit<TComponentVariant | undefined>
}

/**
 * Элемент, чьи размер и вид диктует владелец (`bindStyleToOwner`).
 *
 * Правилу нужны единицы состояния, а не свойства: своё значение элемента
 * остаётся в их `rawValue`, а итог отдаёт резольвер.
 */
export interface IStyledItem {
	readonly states: Pick<TStylableStates, 'size' | 'variant'>
}

/** Владелец, чьи размер и вид получают его элементы. */
export interface IStyleOwner {
	readonly size: TComponentSize
	readonly variant: TComponentVariant | undefined
}

export interface IStylable<
	TProps extends IStylableProps = IStylableProps,
	TEvents extends Record<string, (...args: any) => any> = TStylableEvents,
	TStates extends TStylableStates = TStylableStates,
> extends IComponentView<TProps, TEvents, TStates> {
	size: TComponentSize
	variant: TComponentVariant | undefined
}
