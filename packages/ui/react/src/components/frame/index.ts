/**
 * Frame — слой поверх страницы на базе TFrame: телепорт, раскладка, номер слоя.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupFrame } from './setup.component'

// 3. View (JSX-шаблон)
export { Frame } from './Frame'
