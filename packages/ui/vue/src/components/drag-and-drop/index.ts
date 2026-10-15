import type { TClosedComponent } from '../../adapter'
import DragAndDropComponent from './DragAndDrop.vue'

export { default as BaseDragAndDrop, emitsDragAndDrop, propsDragAndDrop } from './base.component'

export const DragAndDrop: TClosedComponent<typeof DragAndDropComponent> = DragAndDropComponent
