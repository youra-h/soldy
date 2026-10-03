import type { TPartGroupKind } from '../format'
import type { TDateInputParts } from '../types'

/** Кусок значения, прочитанный видом своей группы. */
export type TValuePiece = {
	readonly kind: TPartGroupKind
	readonly text: string
	readonly parts: TDateInputParts
}
