import type { IService, IServiceContext, TServiceEvents } from './types'
import { TEvented } from '@soldy/core'

export abstract class TBaseService<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TServiceEvents<TInstance>,
> implements IService<TInstance, TEvents> {
	abstract readonly namespace: symbol
	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	install(ctx: IServiceContext<TInstance>): void {
		;(this.events as TEvented<TServiceEvents<TInstance>>).emit('install', ctx)
	}

	destroy(): void {
		;(this.events as TEvented<TServiceEvents<TInstance>>).emit('destroy', {
			instance: null,
		} as IServiceContext<TInstance>)
	}
}
