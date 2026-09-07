import type { TAriaAttributes, TClasses } from './../../../common'
import type { IStateUnit, IVisibilityState, TActionEvent } from '../../../common'
import type { IComponent, IComponentProps, TComponentEvents, TComponentStates } from '../component'

/**
 * Направление письма.
 *
 * `'inherit'` (значение по умолчанию) означает «не задавать `dir` вовсе» —
 * элемент наследует направление от предка (в т.ч. от `<html dir>`). Отдельного
 * `undefined` нет намеренно: writable-проп обязан иметь конкретное значение,
 * иначе его нельзя вернуть в исходное состояние через механизм синхронизации
 * (он везде трактует `undefined` как «не трогать»).
 */
export type TDirection = 'ltr' | 'rtl' | 'inherit'

export type TComponentViewStates = TComponentStates & {
	/** Класс state для `rendered`. */
	rendered: IStateUnit<boolean>
	/** Класс state для `visible`. */
	visible: IVisibilityState
}

export type TComponentViewEvents = TComponentEvents & {
	/** show */
	show: () => void
	/** hide */
	hide: () => void
	/** show:before — вызов e.preventDefault() отменяет показ */
	'show:before': (e: TActionEvent) => void
	/** show:after */
	'show:after': () => void
	/** hide:before — вызов e.preventDefault() отменяет скрытие */
	'hide:before': (e: TActionEvent) => void
	/** hide:after */
	'hide:after': () => void

	/** change:visible */
	'change:visible': (value: boolean) => void
	/** change:rendered */
	'change:rendered': (value: boolean) => void
	/** change:present — rendered && visible */
	'change:present': (value: boolean) => void

	/** change:tag */
	'change:tag': (value: string | object) => void
	/** change:direction */
	'change:direction': (value: TDirection) => void
	/** change:classes (без baseClass) */
	'change:classes': (value: string[]) => void
	/** ready — срабатывает когда компонент монтируется/демонтируется из DOM */
	ready: (value: boolean) => void
}

export interface IComponentViewProps extends IComponentProps {
	/** Отрисован ли компонент (аналог v-if) */
	rendered?: boolean
	/** Виден ли компонент (логическая видимость) */
	visible?: boolean
	tag?: string | object
	/** Направление письма; по умолчанию `'inherit'` — наследуется от предка */
	direction?: TDirection
}

export interface IComponentViewMethods {
	/** Показать компонент */
	show(): void
	/** Скрыть компонент */
	hide(): void
}

export interface IComponentView<
	TProps extends IComponentViewProps = IComponentViewProps,
	TEvents extends Record<string, (...args: any) => any> = TComponentViewEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
>
	extends IComponent<TProps, TEvents, TStates>, IComponentViewMethods {
	/** Отрисован в DOM */
	rendered: boolean
	/** Логическая видимость */
	visible: boolean
	/** Компонент на экране: rendered && visible */
	readonly present: boolean
	/** HTML-тег или компонент */
	tag: string | object
	/** Направление письма (`'inherit'` — наследуется от предка) */
	direction: TDirection
	/**
	 * Значение атрибута `dir`, вычисленное из `direction`: `null` для
	 * `'inherit'` — атрибут не ставится. Аналог `classes`/`aria`: ядро отдаёт
	 * готовое к разметке значение, адаптер только биндит.
	 */
	readonly dir: 'ltr' | 'rtl' | null
	/** CSS-классы (включая baseClass и динамические) */
	readonly classes: TClasses
	/** Атрибуты доступности, вычисленные из состояния */
	readonly aria: TAriaAttributes
	/** Компонент смонтирован в DOM и готов (устанавливается плагин-слоем) */
	ready: boolean
}
