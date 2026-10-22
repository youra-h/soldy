/**
 * Tags — набор тегов на базе TTags и коллекции Tags.
 */

import { withParts } from '@soldy-ui/setup'
import { Tags as TagsComponent } from './Tags'
import { TagsItem } from './item'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupTags } from './setup.component'

// 3. Части
export * from './item'

/** Основная форма — `<Tags.Item>`; плоский `TagsItem` работает так же. */
export const Tags = withParts(TagsComponent, { Item: TagsItem })
