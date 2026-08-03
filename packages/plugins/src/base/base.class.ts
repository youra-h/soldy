import type { IPlugin, IPluginContext, IPluginBundle, TPluginEvents } from './types'
import { TEvented } from '@soldy/core'

export abstract class TBasePlugin<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents<TInstance>,
> implements IPlugin<TInstance, TEvents> {
	abstract readonly namespace: symbol
	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	constructor(
		protected readonly bundle: IPluginBundle,
		protected readonly options?: any,
	) {
		// empty
	}

	install(ctx: IPluginContext<TInstance>): void {
		;(this.events as TEvented<TPluginEvents<TInstance>>).emit('install', ctx)
	}

	destroy(): void {
		;(this.events as TEvented<TPluginEvents<TInstance>>).emit('destroy', {
			instance: null,
		} as IPluginContext<TInstance>)
	}
}
