/**
 * ListBox — список с выбором на базе TListBox и коллекции ListBox.
 */

import { withParts } from '@soldy-ui/setup'
import ListBoxComponent from './ListBox.svelte'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'

export * from './base.component'
export { setupListBox } from './setup.component'
export * from './item'
export * from './group'

/**
 * Основная форма — `<ListBox.Item>` и `<ListBox.Group>`; плоские `ListBoxItem`
 * и `ListBoxGroup` работают так же.
 */
export const ListBox = withParts(ListBoxComponent, { Item: ListBoxItem, Group: ListBoxGroup })
