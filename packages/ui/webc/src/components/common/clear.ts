/**
 * Встроенная кнопка очистки поля — деталь его разметки, одна на поле:
 * строится с первым `clearable` и остаётся за ним. Нажатие — команда поля
 * `clear` того инстанса, что живёт сейчас. Своя кнопка — слот `clear` — её
 * заменяет целиком.
 */

import type { TAttributesMap } from '@soldy-ui/core'
import { createDetail, ownerAttributes } from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

type TClearButton = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps
}

/** Что кнопка берёт у поля: инстанс с командой и состояние. */
export type TClearContext = {
	readonly root: HTMLElement
	readonly ctrl: { clear(): void } | undefined
	readonly state: {
		readonly size?: TButtonElementProps['size']
		readonly disabled?: boolean
		readonly clearAria?: TAttributesMap
	}
	hasSlot(name: string): boolean
}

const clears = new WeakMap<HTMLElement, TClearButton>()

function build(ctx: TClearContext, block: string): TClearButton {
	const { ownerDocument } = ctx.root
	const button = createDetail(ownerDocument, TButtonElement, {
		embedded: `${block}.clear`,
		attributes: { type: 'button' },
	})
	const icon = createDetail(ownerDocument, TIconElement, { embedded: `${block}.clear-icon` })

	button.className = `so-${block}__clear`
	icon.icon = 'close'
	button.appendChild(icon)

	button.addEventListener('so:action:click', (event) => {
		// Клик нативный: всплытие гасится у самого события
		if (event instanceof CustomEvent && event.detail instanceof Event) {
			event.detail.stopPropagation()
		}

		ctx.ctrl?.clear()
	})

	return { button, icon }
}

/** Кнопка поля с пропсами по его состоянию — только сменившимися: `disabled` кнопки нативный. */
export function clearButton(ctx: TClearContext, block: string): TButtonElementProps {
	let clear = clears.get(ctx.root)

	if (!clear) {
		clear = build(ctx, block)
		clears.set(ctx.root, clear)
	}

	const { button, icon } = clear
	const { size } = ctx.state
	const disabled = ctx.state.disabled === true

	if (button.size !== size) button.size = size
	if (button.disabled !== disabled) button.disabled = disabled
	if (icon.size !== size) icon.size = size

	ownerAttributes(button, ctx.state.clearAria)

	return button
}

export function removeClearButton(root: HTMLElement): void {
	clears.get(root)?.button.remove()
}

/**
 * Очистка в обёртке у конца поля, перед `before` (нет его — в конце корня).
 * Обёртку без слота `trailing` держит только кнопка. Сначала кнопка в обёртку,
 * потом обёртка в корень: кнопка входит в документ одной вставкой.
 */
export function placeClearButton(
	ctx: TClearContext & { readonly state: { readonly clearable?: boolean } },
	block: string,
	trailing: HTMLElement,
	before: Node | null,
): void {
	if (ctx.hasSlot('clear')) return

	if (ctx.state.clearable !== true) {
		removeClearButton(ctx.root)

		if (!ctx.hasSlot('trailing')) trailing.remove()

		return
	}

	const button = clearButton(ctx, block)

	if (trailing.firstChild !== button) trailing.prepend(button)
	if (trailing.parentNode !== ctx.root) ctx.root.insertBefore(trailing, before)
}
