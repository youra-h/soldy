import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { DragAndDropDescriptor } from '@soldy-ui/setup'
import type { IDragAndDrop } from '@soldy-ui/core'

export const emitsDragAndDrop: TEmits = useEmits(DragAndDropDescriptor())

export const propsDragAndDrop: TProps = useProps(DragAndDropDescriptor()) as TProps

export type DragAndDropProps = UseProps<typeof DragAndDropDescriptor, IDragAndDrop>

export default {
	name: 'BaseDragAndDrop',
	emits: emitsDragAndDrop,
	props: propsDragAndDrop,
}
