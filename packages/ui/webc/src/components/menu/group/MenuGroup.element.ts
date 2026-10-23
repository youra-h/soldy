/**
 * `<div is="so-menu-group">` — пункты меню под общей подписью. Пункт в группе
 * берёт при сборке её ключ. docs/architecture.md, Layer 8d, «Меню».
 */

import { MenuGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuGroupTemplate } from './menu-group.template'
import { setupMenuGroup } from './setup.component'

export const TMenuGroupElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuGroupDescriptor,
	IItemGroup
> = ElementBase(HTMLDivElement, {
	descriptor: MenuGroupDescriptor,
	template: menuGroupTemplate,
	setup: setupMenuGroup,
})

export type TMenuGroupElementProps = TElementType<typeof TMenuGroupElement>
