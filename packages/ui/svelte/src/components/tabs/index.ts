/**
 * Tabs — набор табов на базе TTabs и коллекции Tabs.
 */

import { withParts } from '@soldy-ui/setup'
import TabsComponent from './Tabs.svelte'
import { TabsItem } from './item'
import { TabsContent } from './content'

export * from './base.component'
export { setupTabs } from './setup.component'
export * from './item'
export * from './content'

/**
 * Основная форма — `<Tabs.Item>` и `<Tabs.Content>`: префиксом служит сам
 * владелец, поэтому имена частей согласованы по построению. Плоские
 * `TabsItem` и `TabsContent` работают так же.
 */
export const Tabs = withParts(TabsComponent, { Item: TabsItem, Content: TabsContent })
