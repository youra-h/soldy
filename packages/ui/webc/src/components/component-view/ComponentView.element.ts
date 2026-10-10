/**
 * <so-component-view> — слой ComponentView.
 *
 * Light DOM: классы из ядра — обычные глобальные BEM-классы, тема работает
 * как есть. Обёртки нет: корень — сам `<so-component-view>`, содержимое
 * остаётся в нём, а классы и наборы ядра база раскладывает на него же, рядом с
 * атрибутами потребителя.
 *
 * Разметка вынесена в component-view.template.ts, жизненный цикл — в TSoldyElement.
 */

import { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { IComponentView, IComponentViewProps } from '@soldy-ui/core'
import { TSoldyElement, defineProps, defineElement, useAttributes } from '../../adapter'
import type { ITemplate, TBinding, TEventListener, THostProp, TUpdateListener } from '../../adapter'
import { componentViewTemplate } from './component-view.template'
import { setupComponentView } from './setup.component'

const DESCRIPTOR = ComponentViewDescriptor()

export class TComponentViewElement extends TSoldyElement<IComponentView> {
	static get observedAttributes(): string[] {
		return useAttributes(DESCRIPTOR)
	}

	protected get descriptor(): IComponentDescriptor {
		return DESCRIPTOR
	}

	protected get template(): ITemplate<IComponentView> {
		return componentViewTemplate
	}

	protected setup(
		ctrl: IComponentView | undefined,
		props: Record<string, unknown>,
		onUpdate: TUpdateListener,
		onEvent: TEventListener,
	): TBinding<IComponentView> {
		return setupComponentView(this, ctrl, props, onUpdate, onEvent)
	}
}

defineProps(TComponentViewElement, DESCRIPTOR)
defineElement('so-component-view', TComponentViewElement)

/**
 * `<so-component-view>` из JS: класс элемента плюс props дескриптора — без
 * тех, которых у элемента нет (`HOST_PROPS`).
 */
export type TComponentViewElementProps = TComponentViewElement &
	Omit<IComponentViewProps, keyof HTMLElement | THostProp>

declare global {
	interface HTMLElementTagNameMap {
		'so-component-view': TComponentViewElementProps
	}
}
