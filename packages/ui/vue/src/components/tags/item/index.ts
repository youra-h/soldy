import type { TClosedComponent } from '../../../adapter'
import TagsItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseTagsItem } from './base.component'

export const TagsItem: TClosedComponent<typeof TagsItemComponent> = TagsItemComponent
