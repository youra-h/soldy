/**
 * <so-button> — слой Button.
 *
 * Обёртки нет: `<so-button>` сам и есть кнопка, корень компонента. Класс,
 * стиль, атрибуты и слушатели на нём действуют сразу, а атрибуты потребителя
 * главнее того, что пишет ядро (`tabindex="-1"`, `role="link"` остаются).
 * Кнопкой его делает ядро: `role="button"`, `tabindex`, `aria-disabled`, а
 * Enter и пробел превращает в клик `TActionPlugin` — `so-button` для них не
 * нативный тег.
 *
 * Элемент связан с формой (form-associated custom element): форму-предка или
 * форму из атрибута `form` он отправляет или сбрасывает по атрибуту `type`, как
 * `<button>` (`formAction` в шаблоне), отправляет её Enter из поля, если он —
 * её кнопка по умолчанию (`implicitSubmission`), а `disabled` выключает его
 * по-настоящему — без фокуса и кликов. Свойства формы — `form`, `labels`,
 * `name`, `value`, `type` — те же, что у `<button>`. `<button is="so-button">`
 * не используется: Safari встроенные элементы не расширяет. Кнопки-ссылки нет:
 * тег всегда `so-button`.
 *
 * Разметка вынесена в button.template.ts, жизненный цикл — в TSoldyElement.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { IButton, IButtonProps } from '@soldy-ui/core'
import { TSoldyElement, defineProps, defineElement, submitKind, useAttributes } from '../../adapter'
import type {
	ITemplate,
	TBinding,
	TEventListener,
	THostProp,
	TSubmitKind,
	TUpdateListener,
} from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

const DESCRIPTOR = ButtonDescriptor()

export class TButtonElement extends TSoldyElement<IButton> {
	/** Элемент связан с формой — см. шапку. */
	static override formAssociated = true

	static get observedAttributes(): string[] {
		return useAttributes(DESCRIPTOR)
	}

	/** Форма кнопки — как у `<button>`: форма-предок или из атрибута `form`. */
	get form(): HTMLFormElement | null {
		return this.internals?.form ?? null
	}

	/** Подписи кнопки — как у `<button>`: `<label for>` и обёртка `<label>`. */
	get labels(): NodeList | null {
		return this.internals?.labels ?? null
	}

	/** Имя в данных формы — атрибут `name`, как у `<button>`. */
	get name(): string {
		return this.getAttribute('name') ?? ''
	}

	set name(value: string) {
		this.setAttribute('name', value)
	}

	/** Значение в данных формы — атрибут `value`, как у `<button>`. */
	get value(): string {
		return this.getAttribute('value') ?? ''
	}

	set value(value: string) {
		this.setAttribute('value', value)
	}

	/**
	 * Что кнопка делает с формой — атрибут `type`, приведённый, как у
	 * `<button>`: неизвестное и отсутствующее значение — `submit`.
	 */
	get type(): TSubmitKind {
		return submitKind(this)
	}

	set type(value: string) {
		this.setAttribute('type', value)
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
