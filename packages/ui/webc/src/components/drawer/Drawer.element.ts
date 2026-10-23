/**
 * `<div is="so-drawer">` — выезжающая панель у края экрана или контейнера;
 * смахивается жестом.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Элемент — сама
 * панель, как корень у Vue: классы, наборы, раскладка (`z-index` слоя, размер
 * переменными) и атрибуты, класс и слушатели потребителя — на нём. В цель
 * `target` (по умолчанию `body`) его уводит база по описанию корня
 * (`teleport`) — сам элемент, как Frame, — а на месте остаётся якорь.
 * `contained` оставляет панель на месте: она встаёт в ближайшем
 * позиционированном предке и прокрутку документа не запирает.
 *
 * Подложка — соседка панели, раньше её в DOM: спутник корня, которого строит
 * шаблон. Ставит её прямо перед панелью — в цели и на месте, — увозит и
 * возвращает вместе с ней и прячет с ней база. Содержимое панели — слоты
 * `title`, `default` и `footer` — остаётся в контексте места, а перенос и
 * `contained` ни панель, ни его не пересобирают.
 *
 * Открытость — `visible`, как у Vue (`v-model:visible`): закрытая панель
 * спрятана вместе с подложкой, а не убрана. Открывает её код
 * (`el.visible = true`, `el.ctrl.show()`), закрытие пользователем — крестиком,
 * нажатием мимо, Escape или жестом — запрос с `close:before`.
 *
 * Разметка вынесена в drawer.template.ts, жизненный цикл и перенос — в
 * ElementBase.
 */

import { DrawerDescriptor } from '@soldy-ui/setup'
import type { IDrawer } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { drawerTemplate } from './drawer.template'
import { setupDrawer } from './setup.component'

export const TDrawerElement = ElementBase(HTMLDivElement, {
	descriptor: DrawerDescriptor(),
	template: drawerTemplate,
	root: { teleport: { target: 'target', contained: 'contained' } },
	setup: setupDrawer,
})

defineElement('so-drawer', TDrawerElement, 'div')

/**
 * `<div is="so-drawer">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов — без
 * тех, что у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TDrawerElementProps = HTMLDivElement &
	IElementBase<IDrawer> &
	TElementProps<typeof DrawerDescriptor, HTMLDivElement>
