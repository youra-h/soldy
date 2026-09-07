import { withParts } from '@soldy/setup'
import ListBoxComponent from './ListBox.vue'
import { ListBoxItem } from './item'

export { default as BaseListBox } from './base.component'
export * from './base.component'
export * from './item'

/** Основная форма — `<ListBox.Item>`; плоский `ListBoxItem` работает так же. */
export const ListBox = withParts(ListBoxComponent, { Item: ListBoxItem })
