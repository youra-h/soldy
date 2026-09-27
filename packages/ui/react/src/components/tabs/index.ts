/**
 * Tabs — набор табов на базе TTabs и коллекции Tabs.
 */

import { withParts } from '@soldy-ui/setup'
import { Tabs as TabsComponent } from './Tabs'
import { TabsItem } from './item'
import { TabsContent } from './content'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupTabs } from './setup.component'

// 3. Части
export * from './item'
export * from './content'

/**
 * Основная форма — `<Tabs.Item>` и `<Tabs.Content>`: префиксом служит сам
 * владелец, поэтому имена частей согласованы по построению. Плоские
 * `TabsItem` и `TabsContent` работают так же.
 */
export const Tabs = withParts(TabsComponent, { Item: TabsItem, Content: TabsContent })
