/**
 * MenuPopoverItem — пункт меню со своей панелью на базе TMenuPopoverItem и фасада пункта коллекции.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupMenuPopoverItem } from './setup.component'

// 3. View (JSX-шаблон)
export { MenuPopoverItem } from './PopoverItem'
