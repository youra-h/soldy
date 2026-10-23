/**
 * `<li is="so-toasts-item">` — тост, внутренняя часть менеджера: рисует его
 * регион, регистрирует `Toasts.element.ts`. События тоста не всплывают —
 * закрытый сообщает менеджер (`so:item:close`).
 */

import { ToastsCollectionItemDescriptor, ToastsItemDescriptor } from '@soldy-ui/setup'
import type { IToastsItem, TToastsItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { setupToastsItem } from './setup.component'
import { toastsItemTemplate } from './toasts-item.template'

export const TToastsItemElement: TElementClassOf<
	typeof HTMLLIElement,
	typeof ToastsItemDescriptor,
	IToastsItem,
	TToastsItemCollectionFacade
> = ElementBase(HTMLLIElement, {
	descriptor: ToastsItemDescriptor,
	facade: ToastsCollectionItemDescriptor,
	template: toastsItemTemplate,
	setup: setupToastsItem,
})

/** Входов у тоста нет: инстанс ему отдаёт регион. */
export type TToastsItemElementProps = TElementType<typeof TToastsItemElement>
