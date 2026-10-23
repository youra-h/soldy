/**
 * `<div is="so-frame">` — слой: в цель `target` уезжает сам элемент
 * потребителя, перенос ведёт база (`teleport`). docs/architecture.md, Layer 8d,
 * «Слой».
 */

import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { frameTemplate } from './frame.template'
import { setupFrame } from './setup.component'

export const TFrameElement: TElementClassOf<typeof HTMLDivElement, typeof FrameDescriptor, IFrame> =
	ElementBase(HTMLDivElement, {
		descriptor: FrameDescriptor,
		template: frameTemplate,
		root: { strategy: 'host', teleport: { target: 'target', contained: 'contained' } },
		setup: setupFrame,
	})

defineElement('so-frame', TFrameElement, 'div')

export type TFrameElementProps = TElementType<typeof TFrameElement>
