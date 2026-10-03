import type { TDateFieldPart } from '@soldy-ui/core'

/** Часть поля даты и её узел — коробка части в ряду. */
export type TDateInputSegmentNode = {
	readonly part: TDateFieldPart
	readonly element: Element
}
