/**
 * Switch — переключатель на базе TSwitch: нативный
 * `<input type="checkbox">` с `role="switch"` и дорожка с ручкой.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupSwitch } from './setup.component'

// 3. View (JSX-шаблон)
export { Switch } from './Switch'
