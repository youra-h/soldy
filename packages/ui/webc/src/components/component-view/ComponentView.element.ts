/**
 * <soldy-component-view> — слой ComponentView.
 *
 * Light DOM: классы из ядра — обычные глобальные BEM-классы, тема работает
 * как есть. Внутри хоста рендерится настоящий элемент с тегом из `tag`,
 * пользовательское содержимое переносится в него.
 */

import { ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'
import { TSoldyElement, defineProps, defineElement, useAttributes } from '../../adapter'
import type { TBinding } from '../../adapter'
import { setupComponentView } from './setup.component'

const DESCRIPTOR = ComponentViewDescriptor()

export class TComponentViewElement extends TSoldyElement<IComponentView> {
	static get observedAttributes(): string[] {
		return useAttributes(DESCRIPTOR)
	}

	private _root: HTMLElement | null = null

	protected get descriptor(): IComponentDescriptor {
		return DESCRIPTOR
	}

	protected setup(
		props: Record<string, unknown>,
		onUpdate: (name: string, value: unknown) => void,
	): TBinding<IComponentView> {
		return setupComponentView(this, props, onUpdate)
	}

	protected render(): void {
		const state = this.state

		if (!state.rendered) {
			this._detachRoot()

			return
		}

		const root = this._ensureRoot(String(state.tag ?? 'div'))

		root.className = ((state.classes as string[]) ?? []).join(' ')
		root.style.display = state.visible === false ? 'none' : ''
	}

	/** Пересоздаёт корень при смене тега: имя тега элемента поменять нельзя. */
	private _ensureRoot(tag: string): HTMLElement {
		if (this._root && this._root.tagName.toLowerCase() === tag) return this._root

		const next = document.createElement(tag)

		this._root?.remove()
		this._root = next
		this.appendChild(next)

		this.light.forEach((node) => next.appendChild(node))
		this.binding?.bindElement(next)

		return next
	}

	private _detachRoot(): void {
		if (!this._root) return

		// Содержимое возвращаем себе, иначе оно уйдёт вместе с корнем
		this.light.forEach((node) => node.remove())
		this._root.remove()
		this._root = null
		this.binding?.bindElement(null)
	}
}

defineProps(TComponentViewElement, DESCRIPTOR)
defineElement('soldy-component-view', TComponentViewElement)
