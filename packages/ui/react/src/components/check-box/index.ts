/**
 * CheckBox — флажок на базе TCheckBox: нативный `<input type="checkbox">`,
 * отметка и «выбрано частично».
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupCheckBox } from './setup.component'

// 3. View (JSX-шаблон)
export { CheckBox } from './CheckBox'
