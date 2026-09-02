import type { IEntity } from '../entity'
import { TEvented } from '../../../common'
import type { IStateUnit } from '../../../common'
import type { IVisibilityState } from '../../../common'

export type TComponentEvents = {
	/** show */
	show: () => void
	/** hide */
	hide: () => void
	/** show:before (можно отменить, вернув false) */
	'show:before': () => boolean
	/** show:after */
	'show:after': () => void
	/** hide:before (можно отменить, вернув false) */
	'hide:before': () => boolean
	/** hide:after */
	'hide:after': () => void

	/** change:visible */
	'change:visible': (value: boolean) => void
	/** change:rendered */
	'change:rendered': (value: boolean) => void
	/** change:present — rendered && visible */
	'change:present': (value: boolean) => void
}

export interface IComponentProps {
	/** Отрисован ли компонент (аналог v-if) */
	rendered?: boolean
	/** Виден ли компонент (логическая видимость) */
	visible?: boolean
}

export type TComponentStates = {
	/** Класс state для `rendered`. */
	rendered: IStateUnit<boolean>
	/** Класс state для `visible`. */
	visible: IVisibilityState
}

export interface IComponentMethods {
	/** Показать компонент */
	show(): void
	/** Скрыть компонент */
	hide(): void
}

export interface IComponent<
	TProps extends IComponentProps = IComponentProps,
	TEvents extends Record<string, (...args: any) => any> = TComponentEvents,
	TStates extends TComponentStates = TComponentStates,
>
	extends IEntity<TProps>, IComponentMethods {
	readonly events: TEvented<TEvents>
	readonly states: TStates
	/** Отрисован в DOM */
	rendered: boolean
	/** Логическая видимость */
	visible: boolean
	/** Компонент на экране: rendered && visible */
	readonly present: boolean
}

/**
 * Опции для создания компонента.
 * props — начальные свойства.
 * states — инъекция state-реализаций.
 */
export interface IComponentOptions<TProps, TStates = any> {
	props?: Partial<TProps>
	/**
	 * Инъекция state-реализаций.
	 * Нужна, чтобы менять поведение state свойств без оверрайда геттеров/сеттеров.
	 */
	states?: Partial<TStates>
}
