import type { IPlugin, IPluginContext, TPluginEvents } from './types'
import { TEvented } from '@soldy/core'

export abstract class TBasePlugin<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents<TInstance>,
> implements IPlugin<TInstance, TEvents> {
	abstract readonly namespace: symbol
	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	install(ctx: IPluginContext<TInstance>): void {
		;(this.events as TEvented<TPluginEvents<TInstance>>).emit('install', ctx)
	}

	destroy(): void {
		;(this.events as TEvented<TPluginEvents<TInstance>>).emit('destroy', {
			instance: null,
		} as IPluginContext<TInstance>)
	}
}
