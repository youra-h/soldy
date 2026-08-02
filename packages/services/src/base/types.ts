import type { TEvented } from '@soldy/core'

/**
 * Контекст, передаваемый сервису при установке.
 */
export interface IServiceContext<TInstance = any> {
	readonly instance: TInstance | null
}

export type TServiceEvents<TInstance = any> = {
	install: (ctx: IServiceContext<TInstance>) => void
	destroy: (ctx: IServiceContext<TInstance>) => void
}

/**
 * Сервис — независимая единица логики, устанавливаемая на компонент.
 */
export interface IService<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TServiceEvents,
> {
	readonly namespace: symbol
	readonly events: TEvented<TEvents>
	install(ctx: IServiceContext<TInstance>): void
	destroy(): void
}

/**
 * Конструктор сервиса (со статическим namespace).
 */
export interface IServiceConstructor<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TServiceEvents,
	S extends IService<TInstance, TEvents> = IService<TInstance, TEvents>,
> {
	new (): S
	readonly namespace: symbol
}

/**
 * Контейнер сервисов.
 */
export interface IServiceContainer {
	use<S extends IService<any, any>>(ServiceCtor: IServiceConstructor<any, any, S>): this
	get<S extends IService<any, any>>(ctor: IServiceConstructor<any, any, S>): S | undefined
	get(namespace: symbol): IService | undefined
	remove<S extends IService<any, any>>(ServiceCtor: IServiceConstructor<any, any, S>): void
}
