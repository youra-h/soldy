import type { IPlugin, IPluginContext, TPluginEvents } from './types'
import { TEvented } from '@soldy/core'

export abstract class TBasePlugin<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
> implements IPlugin<TInstance, TEvents> {
	get namespace(): symbol {
		return (this.constructor as unknown as { namespace: symbol }).namespace
	}

	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	install(ctx: IPluginContext, options?: any): void {
		;(this.events as TEvented<TPluginEvents>).emit('install', ctx, options)
	}

	destroy(): void {
		;(this.events as TEvented<TPluginEvents>).emit('destroy', {} as IPluginContext, undefined)
	}
}
