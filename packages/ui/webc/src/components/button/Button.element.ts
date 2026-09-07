/**
 * <soldy-button> — слой Button.
 *
 * Light DOM с настоящим внутренним `<button>`: сохраняются клавиатура, фокус
 * и участие в форме, которых у кастомного элемента самого по себе нет.
 *
 * Разметка вынесена в button.template.ts, жизненный цикл — в TSoldyElement.
 */

import { ButtonDescriptor } from '@soldy/setup'
import type { IComponentDescriptor } from '@soldy/setup'
import type { IButton } from '@soldy/core'
import { TSoldyElement, defineProps, defineElement, useAttributes } from '../../adapter'
import type { ITemplate, TBinding } from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

const DESCRIPTOR = ButtonDescriptor()

export class TButtonElement extends TSoldyElement<IButton> {
	static get observedAttributes(): string[] {
		return useAttributes(DESCRIPTOR)
	}

	protected get descriptor(): IComponentDescriptor {
		return DESCRIPTOR
	}

	protected get template(): ITemplate {
		return buttonTemplate
	}

	protected setup(
		props: Record<string, unknown>,
		onUpdate: (name: string, value: unknown) => void,
	): TBinding<IButton> {
		return setupButton(this, props, onUpdate)
	}
}

defineProps(TButtonElement, DESCRIPTOR)
defineElement('soldy-button', TButtonElement)
