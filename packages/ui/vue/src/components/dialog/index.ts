import type { TClosedComponent } from '../../adapter'
import DialogComponent from './Dialog.vue'

export { default as BaseDialog, emitsDialog, propsDialog } from './base.component'

export const Dialog: TClosedComponent<typeof DialogComponent> = DialogComponent
