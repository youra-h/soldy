/**
 * ListBoxItem — элемент списка на базе TListBoxItem и фасада элемента коллекции.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupListBoxItem } from './setup.component'

// 3. View (JSX-шаблон)
export { ListBoxItem } from './Item'
