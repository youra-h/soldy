/**
 * `<span is="so-progress-spinner">` — индикатор кольцом. `span`: кольцо кладут
 * в Button и Label, а там HTML разрешает только строчное. Долю готового
 * (`fractionStyle`) база кладёт на корень стиль-выходом.
 */

import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { IProgressSpinner } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { progressSpinnerTemplate } from './progress-spinner.template'
import { setupProgressSpinner } from './setup.component'

export const TProgressSpinnerElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof ProgressSpinnerDescriptor,
	IProgressSpinner
> = ElementBase(HTMLSpanElement, {
	descriptor: ProgressSpinnerDescriptor,
	template: progressSpinnerTemplate,
	root: { strategy: 'host', style: 'fractionStyle' },
	setup: setupProgressSpinner,
})

defineElement('so-progress-spinner', TProgressSpinnerElement, 'span')

export type TProgressSpinnerElementProps = TElementType<typeof TProgressSpinnerElement>
