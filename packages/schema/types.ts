import type { TComponentEvents, IComponentProps, IComponentOptions } from '@soldy/core'
import type { TPluginConstructor } from '@soldy/plugins'

export interface IPropertySchema<TEvents extends Record<string, any> = TComponentEvents> {
	get?: (instance: any) => any
	set?: (instance: any, value: any) => void
	triggers?: (keyof TEvents & string)[]
}

export interface IComponentSchema<
	TProps extends Record<string, any> = IComponentProps,
	TEvents extends Record<string, any> = TComponentEvents,
> {
	/** Свойства, которые можно передать извне (есть set) */
	props: { [K in keyof TProps]?: IPropertySchema<TEvents> }
	/** Вычисляемые read-only свойства (нет set — только get + triggers) */
	readonly?: Record<string, IPropertySchema<TEvents>>
	/** Core-события */
	events?: (keyof TEvents & string)[]
	/** Плагины */
	plugins?: TPluginConstructor<any>[]
	/** Конструктор core-компонента */
	Ctor?: new (options: IComponentOptions<any>) => any
}

/**
 * Полная схема компонента — IComponentSchema + цепной extend.
 * Это тип, который возвращает {@link createSchema}.
 */
export interface ISchema<
	TProps extends Record<string, any> = IComponentProps,
	TEvents extends Record<string, any> = TComponentEvents,
> extends IComponentSchema<TProps, TEvents> {
	extend: <TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
		extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
	) => ISchema<TProps & TExtProps, TEvents & TExtEvents>

	/** Объединить props + readonly в один словарь. */
	getAllProps(): Record<string, IPropertySchema<TEvents> | undefined>

	/**
	 * Все события схемы: явно указанные + собранные из triggers
	 * всех props и readonly-свойств.
	 */
	getAllEvents(): (keyof TEvents & string)[]

	/**
	 * Карта `event → [propName, ...]` —
	 * какие свойства нужно перечитать при срабатывании каждого события.
	 */
	getTriggers(): Map<string, string[]>

	/**
	 * Категории эмитов для адаптеров фреймворков:
	 * - `events`   — чистые события (show, hide, created…)
	 * - `mutable`  — props с setter (можно change + update / onChange)
	 * - `readonly` — computed без setter (только change / onChange)
	 */
	getEmits(): { events: string[]; mutable: string[]; readonly: string[] }
}

// ── Типы эмитов (sync) ───────────────────────────────────────

export type TEmitProperty<TProps extends Record<string, any>> = {
	[K in keyof TProps]: { type: 'property'; name: K; value: TProps[K]; mutable: boolean }
}[keyof TProps]

export type TEmitEvent<TEvents extends Record<string, any>> = {
	[K in keyof TEvents]: {
		type: 'event'
		name: K
		args: TEvents[K] extends (...args: infer A) => any ? A : never
	}
}[keyof TEvents]

/**
 * Уведомление о свойстве или событии.
 * Discriminated union — адаптер различает по `type`.
 */
export type TEmit<
	TProps extends Record<string, any> = Record<string, any>,
	TEvents extends Record<string, any> = Record<string, any>,
> = TEmitProperty<TProps> | TEmitEvent<TEvents>

export type TSubscriber<
	TProps extends Record<string, any> = Record<string, any>,
	TEvents extends Record<string, any> = Record<string, any>,
> = (emit: TEmit<TProps, TEvents>) => void

export interface ISyncBinding<
	TProps extends Record<string, any> = Record<string, any>,
	TEvents extends Record<string, any> = Record<string, any>,
> {
	/** Подписаться на изменения. Возвращает функцию отписки. */
	subscribe: (fn: TSubscriber<TProps, TEvents>) => () => void
	/** Отписаться от всех core-событий и очистить подписчиков. */
	dispose: () => void
}
