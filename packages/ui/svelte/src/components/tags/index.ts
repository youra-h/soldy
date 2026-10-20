/**
 * Tags — набор тегов на базе TTags и коллекции Tags.
 */

import { withParts } from '@soldy-ui/setup'
import TagsComponent from './Tags.svelte'
import { TagsItem } from './item'

export * from './base.component'
export { setupTags } from './setup.component'
export * from './item'

/** Основная форма — `<Tags.Item>`; плоский `TagsItem` работает так же. */
export const Tags = withParts(TagsComponent, { Item: TagsItem })
