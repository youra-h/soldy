/**
 * Кнопка-деталь со значком роли — стрелки Calendar, Scroller и Pagination,
 * шаги NumberInput — и иконка роли в слоте детали. Заданный слот значка
 * заменяет иконку целиком.
 */

import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { createDetail, lend, patch } from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

export type TIconButton = {
	readonly button: TButtonElementProps
	/** Своя иконка; при заданном слоте значка — `null`. */
	readonly icon: TIconElementProps | null
}

export type TIconButtonSpec = {
	readonly embedded: string
	readonly iconEmbedded: string
	/** Класс кнопки: по нему её находят плагины компонента. */
	readonly className: string
	readonly role: string
}

/** Иконка роли — деталь в слот по умолчанию другой детали. */
export function lendRoleIcon(detail: Element, role: string, embedded: string): TIconElementProps {
	const icon = createDetail(detail.ownerDocument, TIconElement, { embedded })

	icon.icon = role
	lend(detail, DEFAULT_SLOT, icon)

	return icon
}

export function iconButton(owner: Document, spec: TIconButtonSpec, slotted: boolean): TIconButton {
	const button = createDetail(owner, TButtonElement, {
		embedded: spec.embedded,
		attributes: { type: 'button' },
	})

	button.className = spec.className

	return {
		button,
		icon: slotted ? null : lendRoleIcon(button, spec.role, spec.iconEmbedded),
	}
}

/** Пропсы кнопки и иконки — только сменившиеся: `disabled` кнопки нативный. */
export function syncIconButton(
	{ button, icon }: TIconButton,
	size: TButtonElementProps['size'],
	disabled: boolean,
): void {
	patch(button, { size, disabled })
	if (icon && icon.size !== size) icon.size = size
}
