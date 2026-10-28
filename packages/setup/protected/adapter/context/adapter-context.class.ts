/**
 * TAdapterContext — a component for the time of its mount: instance, bundle,
 * exchange and extensions. Extensions are keyed by their class, as
 * `TPluginBundle` keys plugins.
 *
 * `bindElement` is a method of the context, not an extension: all six adapters
 * bind the root to `TElementPlugin`, and an extension each of them would have
 * to remember to install.
 *
 * The context's life is four phases: assembled, accepted by the framework
 * (`attach`), being removed (`detach`), destroyed. When the second and the
 * third come only the adapter's runtime knows: acceptance is the assembly
 * itself for Vue, Solid, Svelte, Angular and Web Components and the commit for
 * React; removal begins before the children go. So a phase is a method of the
 * context, as `bindElement` is, not a step every component remembers. The
 * context reports a phase and does nothing on it: what follows is up to those
 * who listen.
 *
 * The exchange members and the assembly props are held until the first
 * `connect()`: extensions read the props in their constructors (a collection
 * item's `meta`), the exchange starts its input memory from them and finds
 * its routes and owners by the members. From then on the exchange lives on
 * its own values, and the context lets both go: the props may be a snapshot
 * of one framework pass, and held until unmount they would keep stale values —
 * a table's previous row list with all its records.
 *
 * One exchange per mount: the first `connect()` creates it, a repeat with the
 * same profile returns it — a framework may call the binding's initializer
 * twice, and there are no assembly props left to start a second one. Another
 * profile is an error: one mount, one framework.
 *
 * The event bus and the extension list are created on first access: a
 * collection facade and a component without extensions have none.
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

/** What the first `connect()` creates the exchange from. */
interface IAssembly {
	readonly members: readonly TMember[]
	readonly props: object
}

/** The extension was created by this very class, not by a subclass or a base. */
function isExact(extension: unknown, ExtensionCtor: TAnyExtensionCtor): boolean {
	return (
		typeof extension === 'object' &&
		extension !== null &&
		Object.getPrototypeOf(extension) === ExtensionCtor.prototype
	)
}

export class TAdapterContext<C extends IComponentContract> implements IAdapterContext<C> {
	private _events?: TEvented<TAdapterEvents>
	/**
	 * Extensions, from the first one. A list, not a map by class: a context
	 * usually has one extension, and a map would cost three times as much.
	 */
	private _extensions?: unknown[]
	/** Before the first `connect()` — the members and assembly props, after it — the mount's exchange. */
	private _link: IAssembly | TExchange
	/** `detach` came: it comes once, from the runtime or from the collection. */
	private _detached = false

	constructor(
		readonly descriptor: IComponentDescriptor,
		readonly instance: C['instance'],
		private readonly _tenancy: IBundleTenancy,
		members: readonly TMember[],
		props: object,
		readonly embedded: string | undefined,
	) {
		this._link = { members, props }
	}

	get events(): TEvented<TAdapterEvents> {
		return (this._events ??= new TEvented())
	}

	get bundle(): IPluginBundle | null {
		return this._tenancy.bundle
	}

	get props(): object | undefined {
		return this._link instanceof TExchange ? undefined : this._link.props
	}

	connect(profile: IAdapterProfile): TExchange {
		const surface = TSurface.of(this.descriptor, profile)
		const link = this._link
		const exchange =
			link instanceof TExchange ? link : new TExchange(link.members, surface, link.props)

		if (exchange.surface !== surface) {
			throw new Error(
				`Обмен ${this.descriptor.ctor.name} уже заведён в другом профиле: одно монтирование — один фреймворк`,
			)
		}

		// The input memory has its own values now: the members and assembly props are not needed
		this._link = exchange

		return exchange
	}

	use(ExtensionCtor: TAnyExtensionCtor, options?: unknown): this {
		const extension = new ExtensionCtor(this, options)
		const extensions = (this._extensions ??= [])
		const index = extensions.findIndex((current) => isExact(current, ExtensionCtor))

		if (index === -1) extensions.push(extension)
		else extensions[index] = extension

		return this
	}

	get<T>(ExtensionCtor: new (...args: any[]) => T): T | undefined {
		const extension = this._extensions?.find((current) => isExact(current, ExtensionCtor))

		return extension instanceof ExtensionCtor ? extension : undefined
	}

	bindElement(element: Element | null): void {
		const plugin = this.bundle?.get(TElementPlugin)

		if (plugin) plugin.element = element
	}

	attach(): void {
		this._events?.emit('attach')
	}

	detach(): void {
		if (this._detached) return

		this._detached = true
		this._events?.emit('detach')
	}

	destroy(): void {
		this.detach()
		this._events?.emit('destroy')
		this._extensions = undefined
		this._tenancy.destroy()
	}
}
