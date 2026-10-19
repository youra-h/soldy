/**
 * ListBox — список с выбором на базе TListBox и коллекции ListBox.
 */

import { withParts } from '@soldy-ui/setup'
import { ListBox as ListBoxComponent } from './ListBox'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupListBox } from './setup.component'

// 3. Части
export * from './item'
export * from './group'

/**
 * Основная форма — `<ListBox.Item>` и `<ListBox.Group>`; плоские `ListBoxItem`
 * и `ListBoxGroup` работают так же.
 */
export const ListBox = withParts(ListBoxComponent, { Item: ListBoxItem, Group: ListBoxGroup })
