import { TEvented } from '@soldy/core'
import type { IPlugin, IPluginBundle, TPluginEvents, TBasePluginEvents } from './types'

export abstract class TBasePlugin<
	TCustomEvents extends Record<string, (...args: any) => any> = {},
> implements IPlugin<TPluginEvents<TCustomEvents>> {
	get key(): symbol {
		return (this.constructor as unknown as { key: symbol }).key
	}

	readonly events = new TEvented<TPluginEvents<TCustomEvents>>()

	install(_bundle: IPluginBundle): void {}

	destroy(): void {
		(this.events as TEvented<TBasePluginEvents>).emit('destroyed');
	}
}
