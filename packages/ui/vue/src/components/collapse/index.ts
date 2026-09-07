import { withParts } from '@soldy/setup'
import CollapseComponent from './Collapse.vue'
import { CollapseItem } from './item'

export { default as BaseCollapse, emitsCollapse, propsCollapse } from './base.component'
export * from './item'

/** Основная форма — `<Collapse.Item>`; плоский `CollapseItem` работает так же. */
export const Collapse = withParts(CollapseComponent, { Item: CollapseItem })
