import type { TClasses } from './../../../common'
import type {
	IComponent,
	IComponentProps,
	TComponentEvents,
	TComponentStates,
} from '../component'

export type TComponentViewStates = TComponentStates

export type TComponentViewEvents = TComponentEvents & {
	/** change:tag */
	'change:tag': (value: string | object) => void
	/** change:classes (без baseClass) */
	'change:classes': (value: string[]) => void
	/** ready — срабатывает когда компонент монтируется/демонтируется из DOM */
	'ready': (value: boolean) => void
}

export interface IComponentViewProps extends IComponentProps {
	tag?: string | object
}

export interface IComponentView<
	TProps extends IComponentViewProps = IComponentViewProps,
	TEvents extends Record<string, (...args: any) => any> = TComponentViewEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
> extends IComponent<TProps, TEvents, TStates> {
	/** HTML-тег или компонент */
	tag: string | object
	/** CSS-классы (включая baseClass и динамические) */
	readonly classes: TClasses
	/** Компонент смонтирован в DOM и готов (устанавливается плагин-слоем) */
	ready: boolean
}
