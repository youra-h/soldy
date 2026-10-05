import type { IExtension } from '../types'

/** Отметки одного элемента: элемент и снимок его `_`. */
export type TMetaEntry<TItem> = {
	readonly item: TItem
	readonly meta: Record<string, unknown>
}

/**
 * События `meta` несут отметки списком: запись (команда или весь `batch()`)
 * отдаёт свои одним событием, в конце — на `change:items`, программный
 * `apply` — списком из одной пары сразу.
 */
export type TMetaEvents<TItem> = {
	/** Мета применена к элементам: добавленным записью или программным `apply`. */
	'meta:applied': (entries: readonly TMetaEntry<TItem>[]) => void
	/** Мета изменена у элементов, обновлённых записью. */
	'meta:changed': (entries: readonly TMetaEntry<TItem>[]) => void
}

/** Контракт расширения meta. Реализуется TMetaExtension. */
export interface IMetaExtension<TItem extends object = any> extends IExtension<
	TItem,
	TMetaEvents<TItem>
> {
	/** Программно применить meta к элементу — `meta:applied` приходит сразу. */
	apply(item: TItem, meta: Record<string, unknown>): void
}
