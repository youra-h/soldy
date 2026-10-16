import type { TClosedComponent } from '../../../adapter'
import ToastsItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseToastsItem } from './base.component'

/** Тост — внутренняя часть менеджера: наружу пакета не экспортируется. */
export const ToastsItem: TClosedComponent<typeof ToastsItemComponent> = ToastsItemComponent
