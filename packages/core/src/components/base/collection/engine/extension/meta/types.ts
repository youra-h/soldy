import type { IExtension } from '../types'
import type { TEvented } from '@soldy/core'

export type TMetaEvents<TItem> = {
	/** Мета применена к элементу (при добавлении или программном apply). */
	'meta:applied': (item: TItem, meta: Record<string, unknown>) => void
	/** Мета изменена у элемента (при обновлении). */
	'meta:changed': (item: TItem, meta: Record<string, unknown>) => void
}

/** Контракт расширения meta. Реализуется TMetaExtension. */
export interface IMetaExtension<TItem extends object = any> extends IExtension<TItem> {
	readonly events: TEvented<TMetaEvents<TItem>>

	/** Программно применить meta к элементу. */
	apply(item: TItem, meta: Record<string, unknown>): void
}
