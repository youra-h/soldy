/**
 * TagsItem — тег на базе TTagsItem и фасада элемента коллекции.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupTagsItem } from './setup.component'

// 3. View (JSX-шаблон)
export { TagsItem } from './Item'
