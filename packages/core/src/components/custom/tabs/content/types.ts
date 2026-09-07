import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
} from '../../../base/component-view'

export type TTabsContentEvents = TComponentViewEvents & {
	/** change:value — панель переключилась на другой таб */
	'change:value': (value: string | number) => void
}

export interface ITabsContentProps extends IComponentViewProps {
	/** Значение таба, к которому привязана панель */
	value?: string | number
}

export type TTabsContentStates = TComponentViewStates

export interface ITabsContent<
	TProps extends ITabsContentProps = ITabsContentProps,
	TEvents extends TTabsContentEvents = TTabsContentEvents,
	TStates extends TTabsContentStates = TTabsContentStates,
> extends IComponentView<TProps, TEvents, TStates> {
	/** Значение таба, к которому привязана панель */
	value: string | number
}
