import { TCollectionEngine } from './engine.class'
import type { ICollectionEngine, ICollectionCore } from './types'
import { TArrayStorage } from './storage'
import type { IStorage } from './storage'
import type { IExtension, IExtensionContext } from './extension'
import type { ICommand } from './commands'

export class TCollection<
	T extends object,
	TExtensions extends Record<string, IExtension<T>> = Record<string, never>,
> {
	public readonly engine: ICollectionEngine<T>
	public readonly extensions: TExtensions

	constructor(
		options: {
			storage?: IStorage<T>
			extensions?: TExtensions
		} = {},
	) {
		this.engine = new TCollectionEngine(
			options.storage ?? new TArrayStorage<T>(),
		) as unknown as ICollectionEngine<T>

		this.extensions = (options.extensions ?? {}) as TExtensions

		const ctx = this._createContext()

		for (const ext of Object.values<IExtension<T>>(this.extensions)) {
			ext.install(ctx)
		}
	}

	/**
	 * Подключить расширение к коллекции с сохранением типизации.
	 *
	 * Возвращает `this` с обновлённым типом `TExtensions`, включающим новое расширение.
	 * Имя расширения (`name`) используется как ключ в `extensions`.
	 *
	 * @example
	 * ```ts
	 * const col = new TCollection<Item>()
	 *   .use(new TPlainExtension())
	 *   .use(new TActivationExtension())
	 *
	 * col.extensions.plain.insert(item)     // типизация работает
	 * col.extensions.activation.activate(item)
	 * ```
	 */
	public use<E extends IExtension<T>>(
		extension: E,
	): TCollection<T, TExtensions & { [K in E['name']]: E }> {
		;(this.extensions as Record<string, IExtension<T>>)[extension.name] = extension

		const ctx = this._createContext()

		extension.install(ctx)

		return this as unknown as TCollection<T, TExtensions & { [K in E['name']]: E }>
	}

	/**
	 * Возвращает основные компоненты коллекции: движок и подключённые расширения.
	 */
	public getCore(): ICollectionCore<T, TExtensions> {
		return {
			engine: this.engine,
			extensions: this.extensions,
		}
	}

	private _createContext(): IExtensionContext<T> {
		return {
			engine: this.engine,
			extensions: this.extensions,
			execute: (cmd: ICommand<T>) => this.engine.execute(cmd),
			batch: (action: () => void) => this.engine.batch(action),
		}
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}
}
