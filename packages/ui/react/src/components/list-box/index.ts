/**
 * ListBox — список с выбором на базе TListBox и коллекции ListBox.
 */

import { withParts } from '@soldy-ui/setup'
import { ListBox as ListBoxComponent } from './ListBox'
import { ListBoxItem } from './item'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupListBox } from './setup.component'

// 3. Части
export * from './item'

/** Основная форма — `<ListBox.Item>`; плоский `ListBoxItem` работает так же. */
export const ListBox = withParts(ListBoxComponent, { Item: ListBoxItem })
