/**
 * NumberInput — поле числа на базе TNumberInput: шаг, границы, формат числа по
 * языку и кнопки «−» и «+».
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupNumberInput } from './setup.component'

// 3. View (JSX-шаблон)
export { NumberInput } from './NumberInput'
