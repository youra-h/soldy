/**
 * `<span is="so-progress-linear">` — индикатор выполнения линией.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`). Корень по умолчанию — `span`, как тег ядра:
 * полосу кладут в Button и Label, а внутри них HTML разрешает только строчную
 * разметку.
 *
 * Размер, вариант и ось (`--size-*`, `--variant-*`, `--horizontal` или
 * `--vertical`), бег (`data-indeterminate`), роль, значения и имя для
 * скринридера и `dir` раскладывает на элемент база. Долю готового —
 * переменную `--so-progress-linear-percent` выхода `percentStyle` — тоже она:
 * это стиль-выход компонента, и его имя элемент называет базе в описании
 * корня, как `fractionStyle` у кольца. Стиль потребителя главнее доли,
 * скрытие — главнее обоих.
 *
 * Разметка вынесена в progress-linear.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import type { IProgressLinear } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { progressLinearTemplate } from './progress-linear.template'
import { setupProgressLinear } from './setup.component'

export const TProgressLinearElement = ElementBase(HTMLSpanElement, {
	descriptor: ProgressLinearDescriptor(),
	template: progressLinearTemplate,
	root: { style: 'percentStyle' },
	setup: setupProgressLinear,
})

defineElement('so-progress-linear', TProgressLinearElement, 'span')

/**
 * `<span is="so-progress-linear">` из JS: нативный `span`, своё элемента
 * soldy (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `span` уже есть, и без
 * `HOST_PROPS` (`TElementProps`).
 */
export type TProgressLinearElementProps = HTMLSpanElement &
	IElementBase<IProgressLinear> &
	TElementProps<typeof ProgressLinearDescriptor, HTMLSpanElement>
