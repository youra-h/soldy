import type { TDrawable, TDrawnFiller, TDrawnItem } from './types'

/** Запись элемента на его месте среди показанных. */
export function drawnItem<TItem extends TDrawable>(item: TItem, place: number): TDrawnItem<TItem> {
	return { kind: 'item', key: item.uid, item, place }
}

/** Распорка на `count` пропущенных элементов по `step` пикселей. */
export function drawnFiller(key: number, count: number, step: number): TDrawnFiller {
	return { kind: 'filler', key, style: { '--s-filler-height': `${count * step}px` } }
}
