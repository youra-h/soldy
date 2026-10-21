/**
 * MenuCheckboxItem — флажок меню на базе TMenuCheckboxItem и фасада пункта коллекции.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupMenuCheckboxItem } from './setup.component'

// 3. View (JSX-шаблон)
export { MenuCheckboxItem } from './CheckboxItem'
