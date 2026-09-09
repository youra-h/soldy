import type { TEvented } from '@soldy/core'

/**
 * Контекст, передаваемый плагину при установке.
 */
export interface IPluginContext {
	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	getInstance<T>(): T | null
}

export type TPluginEvents = {
	install: (ctx: IPluginContext, options?: any) => void
	destroy: (ctx: IPluginContext, options?: any) => void
	/**
	 * Плагин создан и доступен снаружи. Эмитится adapter-слоем — не в install,
	 * потому что на момент установки подписчиков ещё нет: bundle собирается
	 * раньше, чем фреймворк привязывает обработчики событий.
	 */
	create: (plugin: IPlugin<any, any>) => void
}

/**
 * Плагин — независимая единица логики, устанавливаемая на компонент.
 */
export interface IPlugin<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
> {
	readonly events: TEvented<TEvents>
	install(ctx: IPluginContext, options?: any): void
	/** Объявить плагин доступным снаружи. Вызывается adapter-слоем. */
	created(): void
	destroy(): void
}

/**
 * Конструктор плагина (со статическим namespace).
 */
export interface IPluginConstructor<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
	P extends IPlugin<TInstance, TEvents> = IPlugin<TInstance, TEvents>,
> {
	new (): P
}

/**
 * Контейнер плагинов.
 */
export interface IPluginBundle {
	/**
	 * Компонент, которому принадлежит набор.
	 *
	 * Тот же метод, что плагин внутри бандла видит как `ctx.getInstance()` —
	 * контекст отдаёт именно его, связанным. Одно имя и одна сигнатура снаружи
	 * и изнутри.
	 *
	 * Наружу нужен потому, что владельческий плагин получает от
	 * `TCollectionBundlesPlugin` бандлы элементов, а дотянуться должен до самих
	 * элементов — например, чтобы проставить им `data-*`.
	 */
	getInstance<T>(): T | null
	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: Record<string, any>,
	): this
	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void
}
