import type { TDatePart } from '@soldy-ui/core'

/** Часть поля даты и её узел — коробка части в ряду. */
export type TDateInputSegmentNode = {
	readonly part: TDatePart
	readonly element: Element
}
