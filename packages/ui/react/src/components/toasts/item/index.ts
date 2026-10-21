/**
 * ToastsItem — тост на базе TToastsItem и фасада элемента коллекции.
 * Внутренняя часть менеджера: наружу пакета не экспортируется.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupToastsItem } from './setup.component'

// 3. View (JSX-шаблон)
export { ToastsItem } from './Item'
