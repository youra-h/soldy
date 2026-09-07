/**
 * <soldy-component-view> — слой ComponentView.
 *
 * Light DOM: классы из ядра — обычные глобальные BEM-классы, тема работает
 * как есть. Внутри хоста рендерится элемент с тегом из `tag`.
 *
 * Разметка вынесена в component-view.template.ts, жизненный цикл — в TSoldyElement.
 */

import { ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'
import { TSoldyElement, defineProps, defineElement, useAttributes } from '../../adapter'
import type { ITemplate, TBinding } from '../../adapter'
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

	protected get template(): ITemplate {
		return componentViewTemplate
	}

	protected setup(
		props: Record<string, unknown>,
		onUpdate: (name: string, value: unknown) => void,
	): TBinding<IComponentView> {
		return setupComponentView(this, props, onUpdate)
	}
}

defineProps(TComponentViewElement, DESCRIPTOR)
defineElement('soldy-component-view', TComponentViewElement)
