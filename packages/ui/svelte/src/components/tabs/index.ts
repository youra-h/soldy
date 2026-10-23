import { withParts } from '@soldy-ui/setup'
import TabsComponent from './Tabs.svelte'
import { TabsItem } from './item'
import { TabsContent } from './content'

export * from './base.component'
export { setupTabs } from './setup.component'
export * from './item'
export * from './content'

export const Tabs = withParts(TabsComponent, { Item: TabsItem, Content: TabsContent })
