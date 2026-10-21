/**
 * `<span is="so-rating">` — оценка звёздами: ползунок с одной ручкой (APG,
 * Rating Slider), у которого шкала — ряд звёзд.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию, строчный — оценку
 * кладут в подпись `Label`, а внутри `label` HTML разрешает только строчную
 * разметку. Поле — нативный `input[type="range"]` в обычном DOM страницы:
 * роль, значение, границы, `disabled` и отправку формы даёт браузер.
 *
 * На корне из наборов ядра — `attrs` (`dir`) и `dataset` (`data-disabled`),
 * `aria` — на поле, его кладёт шаблон. Атрибуты потребителя остаются на
 * корне, как у Vue: указатель поле не ловит, и обработчик потребителя на поле
 * не сработал бы никогда. `id` — проп поля (`fieldId` в описании корня):
 * атрибут разметки база берёт пропом первой сборки и снимает с корня, на поле
 * его пишет шаблон, из кода — `ctrl.id`, а `el.id` — собственный `id` корня.
 * Без признака `id` встал бы и на корень, и на поле, и `<label for>` нашёл бы
 * корень.
 *
 * Разметка вынесена в rating.template.ts, жизненный цикл — в SoldyElement.
 */

import { RatingDescriptor } from '@soldy-ui/setup'
import type { IRating } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { ratingTemplate } from './rating.template'
import { setupRating } from './setup.component'

export const TRatingElement = SoldyElement(HTMLSpanElement, {
	descriptor: RatingDescriptor(),
	template: ratingTemplate,
	root: { sets: ['attrs', 'dataset'], fieldId: true },
	setup: setupRating,
})

defineElement('so-rating', TRatingElement, 'span')

/**
 * `<span is="so-rating">` из JS: нативный `span`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов
 * (`aria_label`) — без тех, что у `span` уже есть (`id` — собственный `id`
 * корня), и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TRatingElementProps = HTMLSpanElement &
	ISoldyElement<IRating> &
	TSoldyElementProps<typeof RatingDescriptor, HTMLSpanElement>
