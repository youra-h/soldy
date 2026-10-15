import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import TagsComponent from './Tags.vue'
import { TagsItem } from './item'

export { default as BaseTags, emitsTags, propsTags } from './base.component'
export * from './item'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const TagsOwner: TClosedComponent<typeof TagsComponent> = TagsComponent

/** Основная форма — `<Tags.Item>`; плоский `TagsItem` работает так же. */
export const Tags = withParts(TagsOwner, { Item: TagsItem })
