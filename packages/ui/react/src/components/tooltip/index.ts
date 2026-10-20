/**
 * Tooltip — подсказка у триггера на базе TTooltip: описание или имя
 * триггера, панель — Frame у корня.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupTooltip } from './setup.component'

// 3. View (JSX-шаблон)
export { Tooltip } from './Tooltip'
