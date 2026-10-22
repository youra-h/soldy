/**
 * SelectItem — опция списка Select на базе TSelectItem и фасада элемента коллекции.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupSelectItem } from './setup.component'

// 3. View (JSX-шаблон)
export { SelectItem } from './Item'
