/**
 * `<span is="so-tooltip">` — подсказка у триггера: строчный корень — обёртка
 * триггера и цель наведения, панель — деталь Frame. docs/architecture.md,
 * Layer 8d, «Панель у триггера».
 */

import { TooltipDescriptor } from '@soldy-ui/setup'
import type { ITooltip } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { tooltipTemplate } from './tooltip.template'
import { setupTooltip } from './setup.component'

export const TTooltipElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof TooltipDescriptor,
	ITooltip
> = ElementBase(HTMLSpanElement, {
	descriptor: TooltipDescriptor,
	template: tooltipTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'] },
	setup: setupTooltip,
})

defineElement('so-tooltip', TTooltipElement, 'span')

export type TTooltipElementProps = TElementType<typeof TTooltipElement>
