import type { TEvented } from '@soldy-ui/core'
import type { IOptionScope } from './types'

/** Область наблюдателя опции. Закрытие снимает всё, что в ней зарегистрировано. */
export class TOptionScope implements IOptionScope {
	private _disposers: (() => void)[] = []

	on<TSource extends Record<string, (...args: any) => any>, K extends keyof TSource>(
		source: TEvented<TSource>,
		event: K,
		handler: TSource[K],
	): void {
		source.on(event, handler)
		this._disposers.push(() => source.off(event, handler))
	}

	add(dispose: () => void): void {
		this._disposers.push(dispose)
	}

	close(): void {
		const disposers = this._disposers

		this._disposers = []

		for (const dispose of disposers) dispose()
	}
}
