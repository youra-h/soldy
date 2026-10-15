/**
 * ListBox — список с выбором на базе TListBox и коллекции ListBox.
 */

import { withParts } from '@soldy-ui/setup'
import { ListBox as ListBoxComponent } from './ListBox'
import { ListBoxItem } from './item'

export * from './base.component'
export { setupListBox } from './setup.component'
export * from './item'

/** Основная форма — `<ListBox.Item>`; плоский `ListBoxItem` работает так же. */
export const ListBox = withParts(ListBoxComponent, { Item: ListBoxItem })
