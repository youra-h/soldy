/**
 * Менеджер тостов. Тост — внутренняя часть (`ToastsItem`): тосты приходят из
 * кода (`useToasts().show`), в разметку их не ставят, и наружу часть не
 * выходит.
 */

export * from './base.component'
export { setupToasts } from './setup.component'
export { default as Toasts } from './Toasts.svelte'
