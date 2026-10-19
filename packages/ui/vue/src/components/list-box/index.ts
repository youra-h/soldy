import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import ListBoxComponent from './ListBox.vue'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'

export { default as BaseListBox } from './base.component'
export * from './base.component'
export * from './item'
export * from './group'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const ListBoxOwner: TClosedComponent<typeof ListBoxComponent> = ListBoxComponent

/**
 * Основная форма — `<ListBox.Item>` и `<ListBox.Group>`; плоские `ListBoxItem`
 * и `ListBoxGroup` работают так же.
 */
export const ListBox = withParts(ListBoxOwner, { Item: ListBoxItem, Group: ListBoxGroup })
