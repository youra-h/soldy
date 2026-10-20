/**
 * Popover — панель с произвольным содержимым у триггера на базе TPopover:
 * немодальный диалог, панель — Frame у корня.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupPopover } from './setup.component'

// 3. View (JSX-шаблон)
export { Popover } from './Popover'
