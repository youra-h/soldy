import { withParts } from '@soldy/setup'
import TabsComponent from './Tabs.vue'
import { TabsItem } from './item'
import { TabsContent } from './content'

export { default as BaseTabs, emitsTabs, propsTabs } from './base.component'
export * from './item'
export * from './content'

/**
 * Основная форма записи — `<Tabs.Item>` и `<Tabs.Content>`: префиксом служит
 * сам владелец, поэтому имена частей согласованы по построению. Плоские
 * `TabsItem` / `TabsContent` экспортируются выше и работают так же.
 */
export const Tabs = withParts(TabsComponent, { Item: TabsItem, Content: TabsContent })
