/**
 * `<div is="so-drawer">` — выезжающая панель: элемент — сама панель, в цель его
 * уводит база (`teleport`), подложка — спутник корня. Открытость — `visible`.
 * docs/architecture.md, Layer 8d, «Модальный слой и тосты».
 */

import { DrawerDescriptor } from '@soldy-ui/setup'
import type { IDrawer } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { drawerTemplate } from './drawer.template'
import { setupDrawer } from './setup.component'

export const TDrawerElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof DrawerDescriptor,
	IDrawer
> = ElementBase(HTMLDivElement, {
	descriptor: DrawerDescriptor,
	template: drawerTemplate,
	root: { strategy: 'host', teleport: { target: 'target', contained: 'contained' } },
	setup: setupDrawer,
})

defineElement('so-drawer', TDrawerElement, 'div')

export type TDrawerElementProps = TElementType<typeof TDrawerElement>
