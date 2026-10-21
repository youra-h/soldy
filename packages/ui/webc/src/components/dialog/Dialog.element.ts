/**
 * `<div is="so-dialog">` — модальное окно: по центру или у края экрана, с
 * разворотом на весь экран.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Элемент — сама панель
 * окна, как корень у Vue: классы, наборы, раскладка (`z-index` слоя, размер и
 * отступ переменными) и атрибуты, класс и слушатели потребителя — на нём. В
 * цель `target` (по умолчанию `body`) его уводит база по описанию корня
 * (`teleport`) — сам элемент, как Frame, — а на месте остаётся якорь. Места
 * «на месте» у окна нет: оно всегда поверх страницы.
 *
 * Подложка — соседка окна, раньше его в DOM: спутник корня, которого строит
 * шаблон. Ставит её прямо перед окном, увозит в цель вместе с ним и прячет с
 * ним база. Содержимое окна — слоты `title`, `default` и `footer` — остаётся в
 * контексте места: кнопка в окне видит локаль провайдера вокруг его места, а
 * перенос ни окно, ни её не пересобирает.
 *
 * Открытость — `visible`, как у Vue (`v-model:visible`): закрытое окно спрятано
 * вместе с подложкой, а не убрано, и состояние содержимого переживает
 * закрытие. Открывает его код (`el.visible = true`, `el.ctrl.show()`), закрытие
 * пользователем — запрос с `close:before`.
 *
 * Разметка вынесена в dialog.template.ts, жизненный цикл и перенос — в
 * SoldyElement.
 */

import { DialogDescriptor } from '@soldy-ui/setup'
import type { IDialog } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { dialogTemplate } from './dialog.template'
import { setupDialog } from './setup.component'

export const TDialogElement = SoldyElement(HTMLDivElement, {
	descriptor: DialogDescriptor(),
	template: dialogTemplate,
	root: { teleport: { target: 'target' } },
	setup: setupDialog,
})

defineElement('so-dialog', TDialogElement, 'div')

/**
 * `<div is="so-dialog">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов — без
 * тех, что у `div` уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TDialogElementProps = HTMLDivElement &
	ISoldyElement<IDialog> &
	TSoldyElementProps<typeof DialogDescriptor, HTMLDivElement>
