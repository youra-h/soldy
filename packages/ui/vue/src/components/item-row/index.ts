import type { TClosedComponent } from '../../adapter'
import ItemRowComponent from './ItemRow.vue'

/** Внутренняя деталь разметки элементов коллекций: наружу пакета не выходит. */
export const ItemRow: TClosedComponent<typeof ItemRowComponent> = ItemRowComponent
