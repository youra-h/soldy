import type { TGroupSpec } from '../format'
import type { TDateInputParts } from '../types'

/** Кусок значения, прочитанный спецификацией своей группы. */
export type TValuePiece = {
	readonly spec: TGroupSpec
	readonly text: string
	readonly parts: TDateInputParts
}
