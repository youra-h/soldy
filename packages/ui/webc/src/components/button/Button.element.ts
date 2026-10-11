/**
 * `<button is="so-button">` — слой Button.
 *
 * Элемент — настоящая `<button>`, расширенная классом soldy (customized
 * built-in, см. `SoldyElement`). Всё, что браузер делает для кнопки, он делает
 * и для неё: отправка и сброс формы по `type`, `submitter` — она сама,
 * `new FormData(form, submitter)`, Enter в поле формы, `formaction` и прочие
 * `form*`, `<fieldset disabled>`, `<label for>`, `:default`, `popovertarget`,
 * фокус, Enter и пробел, роль и доступное имя. Повторять это руками адаптер не
 * пытается: часть поведения браузер отдаёт только нативной кнопке.
 *
 * Ядро получает тег `button`, нативный: `role` и `tabindex` не пишет, а
 * `disabled` пишет нативным атрибутом, как у `<Button>` во Vue. Свойства
 * `disabled`, `type`, `name`, `value`, `form` — нативные свойства кнопки.
 *
 * Разметка вынесена в button.template.ts, жизненный цикл — в SoldyElement.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton, IButtonProps } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, THostProp } from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

export const TButtonElement = SoldyElement(HTMLButtonElement, {
	descriptor: ButtonDescriptor(),
	template: buttonTemplate,
	setup: setupButton,
})

defineElement('so-button', TButtonElement, 'button')

/**
 * `<button is="so-button">` из JS: нативная кнопка, своё элемента soldy
 * (`ctrl`, `state`) и props дескриптора — без тех, что у кнопки уже есть по
 * тегу, и без `HOST_PROPS`.
 */
export type TButtonElementProps = HTMLButtonElement &
	ISoldyElement<IButton> &
	Omit<IButtonProps, keyof HTMLButtonElement | THostProp>
