import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import TabsComponent from './Tabs.vue'
import { TabsItem } from './item'
import { TabsContent } from './content'

export { default as BaseTabs, emitsTabs, propsTabs } from './base.component'
export * from './item'
export * from './content'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const TabsOwner: TClosedComponent<typeof TabsComponent> = TabsComponent

/**
 * Основная форма записи — `<Tabs.Item>` и `<Tabs.Content>`: префиксом служит
 * сам владелец, поэтому имена частей согласованы по построению. Плоские
 * `TabsItem` / `TabsContent` экспортируются выше и работают так же.
 */
export const Tabs = withParts(TabsOwner, { Item: TabsItem, Content: TabsContent })
