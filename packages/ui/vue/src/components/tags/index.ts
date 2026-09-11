import { withParts } from '@soldy/setup'
import TagsComponent from './Tags.vue'
import { TagsItem } from './item'

export { default as BaseTags, emitsTags, propsTags } from './base.component'
export * from './item'

/** Основная форма — `<Tags.Item>`; плоский `TagsItem` работает так же. */
export const Tags = withParts(TagsComponent, { Item: TagsItem })
