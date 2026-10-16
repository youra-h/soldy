import type { TClosedComponent } from '../../adapter'
import ToastsComponent from './Toasts.vue'

export { default as BaseToasts, emitsToasts, propsToasts } from './base.component'

/**
 * Менеджер тостов. Тост — внутренняя часть (`ToastsItem`): тосты приходят из
 * кода (`useToasts().show`), в разметку их не ставят, и наружу часть не
 * выходит.
 */
export const Toasts: TClosedComponent<typeof ToastsComponent> = ToastsComponent
