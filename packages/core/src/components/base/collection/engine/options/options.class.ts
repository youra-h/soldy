import type { IEngineOptionsReader, TEngineOptions, TOptionWatcher } from './types'
import { TOptionScope } from './scope.class'

/**
 * Опции движка: значения, которые компонент передаёт расширениям после
 * сборки, — например, своего владельца. Пишутся только переданные ключи;
 * сменившийся ключ будит своих наблюдателей.
 */
export class TEngineOptionStore<
	TOptions extends TEngineOptions,
> implements IEngineOptionsReader<TOptions> {
	private readonly _values: Partial<TOptions> = {}
	private readonly _watchers = new Map<keyof TOptions, Set<() => void>>()

	/** Записать опции. Пишутся только переданные ключи; равное текущему наблюдателей не будит. */
	set(patch: Partial<TOptions>): void {
		for (const key in patch) {
			if (this._values[key] === patch[key]) continue

			this._values[key] = patch[key]

			for (const run of [...(this._watchers.get(key) ?? [])]) run()
		}
	}

	get<K extends keyof TOptions>(key: K): TOptions[K] | undefined {
		return this._values[key]
	}

	watch<K extends keyof TOptions>(key: K, watcher: TOptionWatcher<TOptions[K]>): () => void {
		let scope = new TOptionScope()

		const run = (): void => {
			scope.close()
			scope = new TOptionScope()
			watcher(this._values[key], scope)
		}

		const runs = this._watchers.get(key) ?? new Set<() => void>()

		this._watchers.set(key, runs)
		runs.add(run)
		run()

		return () => {
			runs.delete(run)
			scope.close()
		}
	}
}
