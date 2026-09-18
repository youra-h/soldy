/**
 * TAdapterContext — контекст адаптера: собранный компонент, расширения по классу и уничтожение.
 *
 * Устроен как `TPluginBundle` у плагинов: расширение подключается
 * `.use(Ctor, options?)` и извлекается `.get(Ctor)`. Жизненный цикл — через
 * `TEvented`: `destroy()` эмитит `destroy`, забывает расширения и уничтожает
 * набор, если тот собран для этого контекста.
 */

import { TEvented } from '@soldy/core'
import type { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { IAssembledComponent } from '../../assemble'
import type { IComponentDescriptor } from '../../define'
import type { IAdapterContext, TAdapterEvents, TAnyExtensionCtor } from './types'

export class TAdapterContext<TInstance extends object> implements IAdapterContext<TInstance> {
	readonly instance: TInstance
	readonly bundle: IPluginBundle | null
	readonly accessor: TAccessor
	readonly descriptor: IComponentDescriptor
	readonly props: object
	readonly embedded: string | undefined
	readonly events = new TEvented<TAdapterEvents>()

	private readonly _extensions = new Map<TAnyExtensionCtor, unknown>()
	/** Набор собран для этого контекста; пришедший в конфиге уничтожает тот, кто его передал. */
	private readonly _ownsBundle: boolean

	constructor(
		descriptor: IComponentDescriptor,
		component: IAssembledComponent<TInstance>,
		props: object,
	) {
		this.instance = component.instance
		this.bundle = component.bundle
		this.accessor = component.accessor
		this.descriptor = descriptor
		this.props = props
		this.embedded = component.embedded
		this._ownsBundle = component.ownsBundle
	}

	use(ExtensionCtor: TAnyExtensionCtor, options?: unknown): this {
		this._extensions.set(ExtensionCtor, new ExtensionCtor(this, options))

		return this
	}

	get<T>(ExtensionCtor: new (...args: any[]) => T): T | undefined {
		const extension = this._extensions.get(ExtensionCtor)

		return extension instanceof ExtensionCtor ? extension : undefined
	}

	destroy(): void {
		this.events.emit('destroy')
		this._extensions.clear()

		// После расширений: `destroy` у них отвязывает узел от плагинов,
		// и плагины успевают получить `removed`
		if (this._ownsBundle) this.bundle?.destroy()
	}
}
