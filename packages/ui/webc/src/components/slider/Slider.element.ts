/**
 * `<span is="so-slider">` — ползунок: ручки на рельсе, заливка и метки. Тег
 * строчный: ползунок кладут в подпись `Label`. Набор корня — `rootAria`
 * (группа нескольких ручек), `aria` — полям ручек. docs/architecture.md,
 * Layer 8d, «Поле».
 */

import { SliderDescriptor } from '@soldy-ui/setup'
import type { ISlider } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { sliderTemplate } from './slider.template'
import { setupSlider } from './setup.component'

export const TSliderElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof SliderDescriptor,
	ISlider
> = ElementBase(HTMLSpanElement, {
	descriptor: SliderDescriptor,
	template: sliderTemplate,
	root: { strategy: 'host', aria: 'rootAria' },
	setup: setupSlider,
})

defineElement('so-slider', TSliderElement, 'span')

export type TSliderElementProps = TElementType<typeof TSliderElement>
