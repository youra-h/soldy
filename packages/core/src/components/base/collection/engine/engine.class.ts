import { TEvented } from '@soldy-ui/core'
import { TCollectionStorageDriver } from './driver.class'
import type {
	ICollectionStorageDriver,
	ICollectionEngineCore,
	TCollectionEngineEvents,
} from './types'
import { TArrayStorage } from './storage'
import type { IStorage } from './storage'
import type { IExtension, IExtensionContext } from './extension'
import type { ICommand } from './commands'
import { TEngineOptionStore } from './options'
import type { TEngineOptions } from './options'

export class TCollectionEngine<
	T extends object,
	TExtensions extends Record<string, IExtension<T>> = Record<never, IExtension<T>>,
	// `any` по умолчанию — стирание, как у первых двух параметров: движок, собранный
	// без типа опций, передаётся туда, где его ждут с типом (`TTabsCollection`)
	TOptions extends TEngineOptions = any,
> {
	private readonly _driver: ICollectionStorageDriver<T>
	/**
	 * Опции движка — значения, которые компонент передаёт своим расширениям после
	 * сборки (например, владельца): `set`, `get` и `watch`.
	 */
	public readonly options = new TEngineOptionStore<TOptions>()
	public readonly extensions: TExtensions & Record<string, IExtension<T> | undefined>
	public readonly events = new TEvented<
		TCollectionEngineEvents<TCollectionEngine<T, TExtensions, TOptions>>
	>()

	constructor(options: { storage?: IStorage<T>; extensions: TExtensions }) {
		this._driver = new TCollectionStorageDriver(options.storage ?? new TArrayStorage<T>())

		this.extensions = options.extensions

		const ctx = this._createContext()

		for (const ext of Object.values<IExtension<T>>(this.extensions)) {
			ext.install(ctx)
		}

		// Оповещаем подписчиков о создании движка. Отложено на микрозадачу,
		// чтобы поздние подписчики (фасад коллекции, Vue-эмиты) успели подписаться.
		Promise.resolve().then(() => {
			this.events.emit('engine:create', this)
		})
	}

	/**
	 * Дописать расширение в уже собранный движок.
	 *
	 * Ничего не возвращает: типизированную сборку делает только конструктор —
	 * там состав известен заранее и `TExtensions` строится честно. `use()`
	 * нужен для другого случая: движок уже существует (например, пришёл снаружи
	 * через пропс `engine`, см. `completeEngine`), и в него нужно дописать то,
	 * чего не хватает. На уровне типов такое расширение доступно в `extensions`
	 * по имени как `IExtension<T> | undefined` — гарантии, что оно есть,
	 * `TExtensions` не даёт.
	 *
	 * Имя уже занято — предупреждение, и расширение не ставится: тихая замена
	 * оставила бы подписки прежнего расширения живыми рядом с новым.
	 *
	 * @example
	 * ```ts
	 * const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
	 *   extensions: { plain: new TPlainExtension() },
	 * })
	 *
	 * col.extensions.plain.insert(item)   // типизация работает — известно из конструктора
	 *
	 * const activation = new TActivationExtension<Item>()
	 *
	 * col.use(activation)
	 * activation.activate(item) // col.extensions.activation — `IExtension<Item> | undefined`
	 * ```
	 */
	public use(extension: IExtension<T>): void {
		if (this.has(extension.name)) {
			console.warn(`TCollectionEngine: расширение «${extension.name}» уже установлено`)

			return
		}

		Object.assign(this.extensions, { [extension.name]: extension })

		const ctx = this._createContext()

		extension.install(ctx)
	}

	/** Стоит ли расширение с таким именем. */
	public has(name: string): boolean {
		return this.extensions[name] !== undefined
	}

	/**
	 * Возвращает основные компоненты коллекции: движок и подключённые расширения.
	 */
	public getCore(): ICollectionEngineCore<T, TExtensions> {
		return {
			driver: this._driver,
			extensions: this.extensions,
		}
	}

	private _createContext(): IExtensionContext<T, TOptions> {
		return {
			driver: this._driver,
			extensions: this.extensions,
			execute: (cmd: ICommand<T>) => this._driver.execute(cmd),
			batch: (action: () => void) => this._driver.batch(action),
			options: this.options,
		}
	}

	batch(action: () => void): void {
		this._driver.batch(action)
	}
}
