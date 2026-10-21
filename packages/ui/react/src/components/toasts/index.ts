/**
 * Toasts — менеджер уведомлений на базе TToasts и коллекции Toasts.
 *
 * Тост — внутренняя часть (`ToastsItem`): тосты приходят из кода
 * (`useToasts().show`), в разметку их не ставят, и наружу пакета часть не
 * выходит.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupToasts } from './setup.component'

// 3. View (JSX-шаблон)
export { Toasts } from './Toasts'
