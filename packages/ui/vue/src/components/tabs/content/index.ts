import type { TClosedComponent } from '../../../adapter'
import TabsContentComponent from './Content.vue'

export * from './base.component'
export { default as BaseTabsContent } from './base.component'

export const TabsContent: TClosedComponent<typeof TabsContentComponent> = TabsContentComponent
