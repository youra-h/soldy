import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import ListBoxComponent from './ListBox.vue'
import { ListBoxItem } from './item'

export { default as BaseListBox } from './base.component'
export * from './base.component'
export * from './item'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const ListBoxOwner: TClosedComponent<typeof ListBoxComponent> = ListBoxComponent

/** Основная форма — `<ListBox.Item>`; плоский `ListBoxItem` работает так же. */
export const ListBox = withParts(ListBoxOwner, { Item: ListBoxItem })
