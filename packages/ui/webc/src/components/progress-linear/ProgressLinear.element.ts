/**
 * `<span is="so-progress-linear">` — индикатор линией. `span`: полосу кладут в
 * Button и Label, а там HTML разрешает только строчное. Долю готового
 * (`percentStyle`) база кладёт на корень стиль-выходом.
 */

import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import type { IProgressLinear } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { progressLinearTemplate } from './progress-linear.template'
import { setupProgressLinear } from './setup.component'

export const TProgressLinearElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof ProgressLinearDescriptor,
	IProgressLinear
> = ElementBase(HTMLSpanElement, {
	descriptor: ProgressLinearDescriptor,
	template: progressLinearTemplate,
	root: { strategy: 'host', style: 'percentStyle' },
	setup: setupProgressLinear,
})

defineElement('so-progress-linear', TProgressLinearElement, 'span')

export type TProgressLinearElementProps = TElementType<typeof TProgressLinearElement>
