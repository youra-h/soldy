import { withParts } from '@soldy-ui/setup'
import TagsComponent from './Tags.svelte'
import { TagsItem } from './item'

export * from './base.component'
export { setupTags } from './setup.component'
export * from './item'

export const Tags = withParts(TagsComponent, { Item: TagsItem })
