/**
 * `<so-toasts>` — менеджер тостов вокруг приложения: автономный элемент без
 * коробки (`displayContents`), корень — регион, который база уводит в `target`.
 * Тост показывают `toastsOf(node).show(…)` или движок свойства `engine`.
 * docs/architecture.md, Layer 8d, «Модальный слой и тосты».
 */

import { ToastsCollectionDescriptor, ToastsDescriptor } from '@soldy-ui/setup'
import type { IToasts, TToastsCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { TToastsItemElement } from './item'
import { setupToasts } from './setup.component'
import { toastsTemplate } from './toasts.template'

export const TToastsElement: TElementClassOf<
	typeof HTMLElement,
	typeof ToastsDescriptor,
	IToasts,
	TToastsCollectionFacade
> = ElementBase(HTMLElement, {
	descriptor: ToastsDescriptor,
	facade: ToastsCollectionDescriptor,
	template: toastsTemplate,
	root: { strategy: 'wrapped', teleport: { target: 'target' } },
	setup: setupToasts,
})

defineAutonomousElement('so-toasts', TToastsElement)
// Тост — внутренняя часть: регистрирует его модуль менеджера
defineElement('so-toasts-item', TToastsItemElement, 'li')

export type TToastsElementProps = TElementType<typeof TToastsElement>
