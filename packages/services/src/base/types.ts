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
 * Заменяет плагины и коллекции.
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

export interface IServiceConstructor<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TServiceEvents,
> {
	readonly name: string
	new (): IService<TInstance, TEvents>
}
