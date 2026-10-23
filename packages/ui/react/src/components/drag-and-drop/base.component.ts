import type { IDragAndDrop } from '@soldy-ui/core'
import type { DragAndDropDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type DragAndDropEventProps = EventProps<typeof DragAndDropDescriptor>

/** Пропсы DragAndDrop — без атрибутов DOM: своего узла у обёртки нет. */
export type DragAndDropProps = UseProps<
	typeof DragAndDropDescriptor,
	IDragAndDrop,
	DragAndDropEventProps
>
