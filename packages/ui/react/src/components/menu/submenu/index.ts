/**
 * MenuSubmenu — пункт меню с подменю на базе TMenuSubmenu: пункт меню над ним
 * и меню своих пунктов. Разметку пунктов из данных (`drawItems`) модуль
 * подменю делит с меню, а наружу пакета она не выходит.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupMenuSubmenu } from './setup.component'

// 3. View (JSX-шаблон)
export { MenuSubmenu } from './Submenu'
