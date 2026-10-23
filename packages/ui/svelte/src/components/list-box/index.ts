import { withParts } from '@soldy-ui/setup'
import ListBoxComponent from './ListBox.svelte'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'

export * from './base.component'
export { setupListBox } from './setup.component'
export * from './item'
export * from './group'

export const ListBox = withParts(ListBoxComponent, { Item: ListBoxItem, Group: ListBoxGroup })
