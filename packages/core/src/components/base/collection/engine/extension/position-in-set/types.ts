import type { TAria, TNoEvents } from '../../../../../../common'
import type { TDrawable } from '../draw/types'
import type { IExtension } from '../types'

/**
 * Элемент, которому пишут место в наборе: рисуется коллекцией (`uid`) и
 * держит свой набор `aria`, как любой визуальный элемент коллекции.
 */
export type TPositionable = TDrawable & { readonly aria: TAria }

/** Событий у расширения нет — см. `TNoEvents`. */
export type TPositionInSetEvents = TNoEvents

/**
 * Контракт места в наборе: пока коллекцию рисует окно, нарисованные элементы
 * несут размер набора и своё место в нём (`aria-setsize`, `aria-posinset`).
 */
export interface IPositionInSetExtension<
	TItem extends TPositionable = TPositionable,
> extends IExtension<TItem, TPositionInSetEvents> {}
