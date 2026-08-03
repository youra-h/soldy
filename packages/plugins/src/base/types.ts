import type { TEvented } from '@soldy/core'

/**
 * Контекст, передаваемый плагину при установке.
 */
export interface IPluginContext<TInstance = any> {
	readonly instance: TInstance | null
}

export type TPluginEvents<TInstance = any> = {
	install: (ctx: IPluginContext<TInstance>) => void
	destroy: (ctx: IPluginContext<TInstance>) => void
}

/**
 * Плагин — независимая единица логики, устанавливаемая на компонент.
 */
export interface IPlugin<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
> {
	readonly namespace: symbol
	readonly events: TEvented<TEvents>
	install(ctx: IPluginContext<TInstance>): void
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
	readonly namespace: symbol
}

/**
 * Контейнер плагинов.
 */
export interface IPluginContainer {
	use<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): this
	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	get(namespace: symbol): IPlugin | undefined
	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void
}
