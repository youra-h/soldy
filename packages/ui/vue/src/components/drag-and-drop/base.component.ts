import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { DragAndDropDescriptor } from '@soldy/setup'

export const emitsDragAndDrop: TEmits = useEmits(DragAndDropDescriptor) as unknown as TEmits

export const propsDragAndDrop: TProps = useProps(DragAndDropDescriptor) as TProps

export default {
	name: 'BaseDragAndDrop',
	extends: BaseComponent,
	emits: emitsDragAndDrop,
	props: propsDragAndDrop,
}
