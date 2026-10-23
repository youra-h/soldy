/**
 * `<span is="so-progress-spinner">` — индикатор выполнения кольцом.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`). Корень по умолчанию — `span`, как тег ядра:
 * кольцо кладут в Button и Label, а внутри них HTML разрешает только
 * строчную разметку.
 *
 * Размер и вариант, бег (`data-indeterminate`), роль, значения и имя для
 * скринридера и `dir` раскладывает на элемент база. Долю готового —
 * переменную `--so-progress-spinner-fraction` выхода `fractionStyle` — тоже
 * она: это стиль-выход компонента, и его имя элемент называет базе в описании
 * корня. Стиль потребителя главнее доли, скрытие — главнее обоих.
 *
 * Разметка вынесена в progress-spinner.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { progressSpinnerTemplate } from './progress-spinner.template'
import { setupProgressSpinner } from './setup.component'

export const TProgressSpinnerElement = ElementBase(HTMLSpanElement, {
	descriptor: ProgressSpinnerDescriptor,
	template: progressSpinnerTemplate,
	root: { strategy: 'host', style: 'fractionStyle' },
	setup: setupProgressSpinner,
})

defineElement('so-progress-spinner', TProgressSpinnerElement, 'span')

/**
 * `<span is="so-progress-spinner">` из JS: нативный `span`, своё элемента
 * soldy (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `span` уже есть, и без `HOST_PROPS`
 * (`TElementProps`). Своих входов у кольца нет: пропсы — те, что у любого
 * индикатора выполнения.
 */
export type TProgressSpinnerElementProps = TElementType<typeof TProgressSpinnerElement>
