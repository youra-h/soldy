/**
 * <soldy-button> — слой Button.
 *
 * Light DOM с настоящим внутренним `<button>`: сохраняются клавиатура, фокус
 * и участие в форме, которых у кастомного элемента самого по себе нет.
 *
 * - `tag` по умолчанию `button`; при другом теге disabled уходит в aria-disabled
 * - содержимое внутри тега переопределяет `text`
 */

import { ButtonDescriptor } from '@soldy/setup'
import type { IComponentDescriptor } from '@soldy/setup'
import type { IButton } from '@soldy/core'
import { TSoldyElement, defineProps, defineElement, useAttributes } from '../../adapter'
import type { TBinding } from '../../adapter'
import { setupButton } from './setup.component'

const DESCRIPTOR = ButtonDescriptor()

export class TButtonElement extends TSoldyElement<IButton> {
	static get observedAttributes(): string[] {
		return useAttributes(DESCRIPTOR)
	}

	private _root: HTMLElement | null = null
	private _text: HTMLElement | null = null

	protected get descriptor(): IComponentDescriptor {
		return DESCRIPTOR
	}

	protected setup(
		props: Record<string, unknown>,
		onUpdate: (name: string, value: unknown) => void,
	): TBinding<IButton> {
		return setupButton(this, props, onUpdate)
	}

	protected render(): void {
		const state = this.state

		if (!state.rendered) {
			this._detachRoot()

			return
		}

		const tag = String(state.tag ?? 'button')
		const root = this._ensureRoot(tag)

		root.className = ((state.classes as string[]) ?? []).join(' ')
		root.style.display = state.visible === false ? 'none' : ''

		this._applyDisabled(root, tag, Boolean(state.disabled))

		// Текст показываем только когда пользователь не задал содержимое
		if (this.light.length === 0 && this._text) {
			this._text.textContent = String(state.text ?? '')
		}
	}

	/** Пересоздаёт корень при смене тега: имя тега элемента поменять нельзя. */
	private _ensureRoot(tag: string): HTMLElement {
		if (this._root && this._root.tagName.toLowerCase() === tag) return this._root

		const next = document.createElement(tag)
		const text = document.createElement('span')

		text.className = 's-button__text'
		next.appendChild(text)

		this._root?.remove()
		this._root = next
		this._text = text
		this.appendChild(next)

		this.light.forEach((node) => text.appendChild(node))
		this.binding?.bindElement(next)

		return next
	}

	private _applyDisabled(root: HTMLElement, tag: string, disabled: boolean): void {
		const isNativeButton = tag === 'button'

		root.toggleAttribute('disabled', isNativeButton && disabled)

		if (isNativeButton || !disabled) {
			root.removeAttribute('aria-disabled')
		} else {
			root.setAttribute('aria-disabled', 'true')
		}
	}

	private _detachRoot(): void {
		if (!this._root) return

		this.light.forEach((node) => node.remove())
		this._root.remove()
		this._root = null
		this._text = null
		this.binding?.bindElement(null)
	}
}

defineProps(TButtonElement, DESCRIPTOR)
defineElement('soldy-button', TButtonElement)
