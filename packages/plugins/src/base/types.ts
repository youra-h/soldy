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
	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: Record<string, any>,
	): this
	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void
}
