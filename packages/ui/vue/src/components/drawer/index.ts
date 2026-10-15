import type { TClosedComponent } from '../../adapter'
import DrawerComponent from './Drawer.vue'

export { default as BaseDrawer, emitsDrawer, propsDrawer } from './base.component'

export const Drawer: TClosedComponent<typeof DrawerComponent> = DrawerComponent
