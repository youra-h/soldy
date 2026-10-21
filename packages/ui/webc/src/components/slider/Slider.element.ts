/**
 * `<span is="so-slider">` — ползунок: ручки на рельсе, заливка и метки.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию, строчный — ползунок
 * кладут в подпись `Label`, а внутри `label` HTML разрешает только строчную
 * разметку. Поля ручек — нативные `input[type="range"]` в обычном DOM
 * страницы: роль, значение, границы, `disabled` и отправку формы даёт
 * браузер.
 *
 * На корне — все три набора ядра, как у Vue: `attrs` (`dir`), `dataset`
 * (`data-disabled`, `data-dragging`) и слой `aria` — из набора корня
 * `rootAria`, а не из `aria` (`aria` в описании корня): у нескольких ручек
 * корень — группа с именем и описанием ползунка, у одной набор пуст, а `aria`
 * ползунка ядро отдаёт полям ручек в `thumbs`, и туда его кладёт шаблон.
 * Поля в корне нет: полей столько, сколько ручек, и атрибуты потребителя
 * остаются на корне, как у Vue.
 *
 * Разметка вынесена в slider.template.ts, жизненный цикл — в SoldyElement.
 */

import { SliderDescriptor } from '@soldy-ui/setup'
import type { ISlider } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { sliderTemplate } from './slider.template'
import { setupSlider } from './setup.component'

export const TSliderElement = SoldyElement(HTMLSpanElement, {
	descriptor: SliderDescriptor(),
	template: sliderTemplate,
	root: { aria: 'rootAria' },
	setup: setupSlider,
})

defineElement('so-slider', TSliderElement, 'span')

/**
 * `<span is="so-slider">` из JS: нативный `span`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов
 * (`aria_label`) — без тех, что у `span` уже есть, и без `HOST_PROPS`
 * (`TSoldyElementProps`).
 */
export type TSliderElementProps = HTMLSpanElement &
	ISoldyElement<ISlider> &
	TSoldyElementProps<typeof SliderDescriptor, HTMLSpanElement>
