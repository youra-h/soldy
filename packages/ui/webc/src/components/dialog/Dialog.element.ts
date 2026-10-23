/**
 * `<div is="so-dialog">` — модальное окно; элемент — сама панель, в цель его
 * увозит база (`teleport`). Открытость — `visible`: закрытое окно спрятано, а
 * не убрано, и содержимое переживает закрытие. docs/architecture.md, Layer 8d,
 * «Модальный слой и тосты».
 */

import { DialogDescriptor } from '@soldy-ui/setup'
import type { IDialog } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { dialogTemplate } from './dialog.template'
import { setupDialog } from './setup.component'

export const TDialogElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof DialogDescriptor,
	IDialog
> = ElementBase(HTMLDivElement, {
	descriptor: DialogDescriptor,
	template: dialogTemplate,
	root: { strategy: 'host', teleport: { target: 'target' } },
	setup: setupDialog,
})

defineElement('so-dialog', TDialogElement, 'div')

export type TDialogElementProps = TElementType<typeof TDialogElement>
