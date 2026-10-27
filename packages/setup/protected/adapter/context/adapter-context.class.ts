/**
 * TAdapterContext — компонент на время монтирования: инстанс, набор, обмен и расширения.
 *
 * Расширения регистрируются по самому классу — как `TPluginBundle` ключуется
 * классом плагина.
 *
 * `bindElement` — метод контекста, а не расширение: связку корня с
 * `TElementPlugin` зовут все шесть адаптеров, а расширение каждый из них был бы
 * обязан помнить и подключать.
 *
 * The context's life is four phases: assembled, accepted by the framework
 * (`attach`), being removed (`detach`), destroyed. When the second and the
 * third come only the adapter's runtime knows: acceptance is the assembly
 * itself for Vue, Solid, Svelte, Angular and Web Components and the commit for
 * React; removal begins before the children go. So a phase is a method of the
 * context, as `bindElement`, not a step every component remembers. The
 * context reports a phase and does nothing on it: what follows is up to those
 * who listen.
 *
 * Участников обмена и пропсы сборки контекст держит до первого `connect()`.
 * Пропсы нужны двоим: расширениям, которые читают их в конструкторе (`meta`
 * элемента коллекции), и обмену — его память входов начинается с них.
 * Участники — только обмену: по ним он находит таблицу маршрутов и владельцев.
 * Дальше обмен живёт своими значениями, и контекст отпускает и то и другое:
 * пропсы сборки бывают снимком одного прохода фреймворка, и до размонтирования
 * контекст держал бы значения, которые с тех пор сменились, — у таблицы
 * прежний список строк со всеми записями.
 *
 * Обмен один на монтирование: первый `connect()` его заводит, повторный с тем
 * же профилем отдаёт его же — фреймворк вправе позвать инициализатор связки
 * дважды, а пропсов сборки, с которых начать второй обмен, у контекста уже
 * нет. С другим профилем — ошибка: одно монтирование — один фреймворк.
 *
 * Шина событий контекста и список расширений заводятся с первым обращением:
 * у фасада коллекции и у компонента без расширений их нет.
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

/** Из чего первый `connect()` заводит обмен. */
interface IAssembly {
	readonly members: readonly TMember[]
	readonly props: object
}

/** Расширение заведено этим классом, а не его наследником или предком. */
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
	 * Расширения — с первого. Список, а не карта по классу: расширение у
	 * контекста обычно одно, и карта стоила бы втрое дороже.
	 */
	private _extensions?: unknown[]
	/** До первого `connect()` — участники и пропсы сборки, после — обмен монтирования. */
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

		// Память входов завела свои значения: участники и пропсы сборки больше никому не нужны
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
