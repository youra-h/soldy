/**
 * `<div is="so-skeleton">` — заглушка поверх будущего содержимого.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Содержимое элемента —
 * слот `default`, настоящее содержимое; заглушку перед ним рисует шаблон.
 *
 * Корень есть всегда, а `rendered` и `visible` решают только, показана ли
 * заглушка. Поэтому база видимостью корень не прячет (`hides: false`):
 * `display: none` спрятал бы и содержимое. Классы, наборы и размер
 * (`layout_styles`) раскладывает на элемент база.
 *
 * Разметка вынесена в skeleton.template.ts, жизненный цикл — в SoldyElement.
 */

import { SkeletonDescriptor } from '@soldy-ui/setup'
import type { ISkeleton, ISkeletonProps } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, THostProp } from '../../adapter'
import { skeletonTemplate } from './skeleton.template'
import { setupSkeleton } from './setup.component'

export const TSkeletonElement = SoldyElement(HTMLDivElement, {
	descriptor: SkeletonDescriptor(),
	template: skeletonTemplate,
	root: { hides: false },
	setup: setupSkeleton,
})

defineElement('so-skeleton', TSkeletonElement, 'div')

/**
 * `<div is="so-skeleton">` из JS: нативный `div`, своё элемента soldy и props
 * дескриптора — без тех, что у `div` уже есть, и без `HOST_PROPS`.
 */
export type TSkeletonElementProps = HTMLDivElement &
	ISoldyElement<ISkeleton> &
	Omit<ISkeletonProps, keyof HTMLDivElement | THostProp>
