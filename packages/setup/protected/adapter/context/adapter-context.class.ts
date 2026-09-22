/**
 * TAdapterContext — компонент на время монтирования: инстанс, набор, участники обмена и расширения.
 *
 * Расширения регистрируются по самому классу — карта ключуется конструктором,
 * как `TPluginBundle` ключуется классом плагина.
 *
 * `bindElement` — метод контекста, а не расширение: связку корня с
 * `TElementPlugin` зовут все шесть адаптеров, а расширение каждый из них был бы
 * обязан помнить и подключать.
 */

import { TEvented } from '@soldy-ui/core'
import { TElementPlugin } from '@soldy-ui/plugins'
import type { IPluginBundle } from '@soldy-ui/plugins'
import type { IComponentContract, IComponentDescriptor } from '../../define'
import type { IAdapterProfile } from '../../naming'
import { TExchange } from '../exchange/exchange.class'
import type { TMember } from '../exchange/member.class'
import { TSurface } from '../surface'
import type { IAdapterContext, IBundleTenancy, TAdapterEvents, TAnyExtensionCtor } from './types'

export class TAdapterContext<C extends IComponentContract> implements IAdapterContext<C> {
	readonly events = new TEvented<TAdapterEvents>()

	private readonly _extensions = new Map<TAnyExtensionCtor, unknown>()

	constructor(
		readonly descriptor: IComponentDescriptor,
		readonly instance: C['instance'],
		private readonly _tenancy: IBundleTenancy,
		private readonly _members: readonly TMember[],
		readonly props: object,
		readonly embedded: string | undefined,
	) {}

	get bundle(): IPluginBundle | null {
		return this._tenancy.bundle
	}

	connect(profile: IAdapterProfile): TExchange {
		return new TExchange(this._members, TSurface.of(this.descriptor, profile), this.props)
	}

	use(ExtensionCtor: TAnyExtensionCtor, options?: unknown): this {
		this._extensions.set(ExtensionCtor, new ExtensionCtor(this, options))

		return this
	}

	get<T>(ExtensionCtor: new (...args: any[]) => T): T | undefined {
		const extension = this._extensions.get(ExtensionCtor)

		return extension instanceof ExtensionCtor ? extension : undefined
	}

	bindElement(element: Element | null): void {
		const plugin = this.bundle?.get(TElementPlugin)

		if (plugin) plugin.element = element
	}

	destroy(): void {
		this.events.emit('destroy')
		this._extensions.clear()
		this._tenancy.destroy()
	}
}
