/**
 * <so-button> — слой Button.
 *
 * Обёртки нет: `<so-button>` сам и есть кнопка, корень компонента. Класс,
 * стиль, атрибуты и слушатели на нём действуют сразу, а атрибуты потребителя
 * главнее того, что пишет ядро (`tabindex="-1"`, `role="link"` остаются).
 * Кнопкой его делает ядро: `role="button"`, `tabindex`, `aria-disabled`, а
 * Enter и пробел превращает в `press` `TActionPlugin` — `so-button` для них не
 * нативный тег.
 *
 * Элемент связан с формой (form-associated custom element): форму-предка или
 * форму из атрибута `form` он отправляет или сбрасывает по атрибуту `type`, как
 * `<button>` (`formAction` в шаблоне), а `disabled` выключает его по-настоящему
 * — без фокуса и кликов. `<button is="so-button">` не используется: Safari
 * встроенные элементы не расширяет. Кнопки-ссылки нет: тег всегда `so-button`.
 *
 * Разметка вынесена в button.template.ts, жизненный цикл — в TSoldyElement.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { IButton, IButtonProps } from '@soldy-ui/core'
import { TSoldyElement, defineProps, defineElement, useAttributes } from '../../adapter'
import type { ITemplate, TBinding, TEventListener, THostProp, TUpdateListener } from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

const DESCRIPTOR = ButtonDescriptor()

export class TButtonElement extends TSoldyElement<IButton> {
	/** Элемент связан с формой — см. шапку. */
	static override formAssociated = true

	static get observedAttributes(): string[] {
		return useAttributes(DESCRIPTOR)
	}

	protected get descriptor(): IComponentDescriptor {
		return DESCRIPTOR
	}

	protected get template(): ITemplate<IButton> {
		return buttonTemplate
	}

	protected setup(
		ctrl: IButton | undefined,
		props: Record<string, unknown>,
		onUpdate: TUpdateListener,
		onEvent: TEventListener,
	): TBinding<IButton> {
		return setupButton(this, ctrl, props, onUpdate, onEvent)
	}
}

defineProps(TButtonElement, DESCRIPTOR)
defineElement('so-button', TButtonElement)

/**
 * `<so-button>` из JS: класс элемента плюс props дескриптора, которые вешает
 * defineProps, — без тех, которых у элемента нет (`HOST_PROPS`).
 */
export type TButtonElementProps = TButtonElement & Omit<IButtonProps, keyof HTMLElement | THostProp>

declare global {
	interface HTMLElementTagNameMap {
		'so-button': TButtonElementProps
	}
}
