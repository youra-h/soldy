import { TCollectionEngine } from './collection-engine'
import type { ICollectionEngine } from './collection-engine'
import { TArrayStorage } from './storage'
import type { IStorage } from './storage'
import type { IExtension, IExtensionContext } from './extension'
import type { ICommand } from './command'

export class TCollection<
	T,
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

	private _createContext(): IExtensionContext<T> {
		return {
			engine: this.engine,
			collection: this as any,
			execute: (cmd: ICommand<T>) => this.engine.execute(cmd),
			batch: (action: () => void) => this.engine.batch(action),
		}
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}
}
