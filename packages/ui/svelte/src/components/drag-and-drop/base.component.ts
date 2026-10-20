import type { IDragAndDrop } from '@soldy-ui/core'
import type { DragAndDropDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/**
 * События DragAndDrop (ядро), выведены из дескриптора автоматически:
 * перестановка жестом (`onMoveBefore`, `onMove`) и набор.
 */
export type DragAndDropEventProps = EventProps<typeof DragAndDropDescriptor>

/**
 * Пропсы DragAndDrop — `UseProps`, без атрибутов DOM и без `ref`: своего узла
 * у обёртки нет, и класс, стиль или `id` положить некуда.
 */
export type DragAndDropProps = UseProps<
	typeof DragAndDropDescriptor,
	IDragAndDrop,
	DragAndDropEventProps
>
