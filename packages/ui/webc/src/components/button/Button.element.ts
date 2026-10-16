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
 * Кнопка на другом теге — тот же Button под своим именем: одно имя элемента
 * расширяет один тег (`customElements.define` с `extends`). Её регистрирует
 * фабрика `registerButtonTag` там, где тег впервые нужен разметке библиотеки:
 * `<div is="so-button-div">` — строка элемента ListBox. Имя — имя компонента и
 * тег через дефис. Описание элемента у всех тегов одно (`BUTTON`), отличается
 * только нативный класс, а тег ядро получает от элемента, как всегда: на `div`
 * оно пишет кнопке `role="button"`, `tabindex` и `aria-disabled` вместо
 * нативного `disabled`.
 *
 * Разметка вынесена в button.template.ts, жизненный цикл — в SoldyElement.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type {
	ISoldyElement,
	ISoldyElementSpec,
	TSoldyElementClass,
	TSoldyElementProps,
} from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

/** Описание элемента Button — одно на все его теги: дескриптор, шаблон и setup. */
const BUTTON: ISoldyElementSpec<IButton> = {
	descriptor: ButtonDescriptor(),
	template: buttonTemplate,
	setup: setupButton,
}

export const TButtonElement = SoldyElement(HTMLButtonElement, BUTTON)

defineElement('so-button', TButtonElement, 'button')

/**
 * Теги, на которых Button регистрируется ещё раз (`registerButtonTag`), —
 * сверх своего `button`. Тег здесь — значит, у кнопки на нём есть место в
 * разметке библиотеки: `div` — строка элемента ListBox.
 */
export type TButtonTag = 'div'

/**
 * Нативный класс каждого тега. Тип карты сверяет класс с тегом: класс чужого
 * тега (`div: HTMLSpanElement`) не компилируется, как и тег без класса.
 */
const NATIVE_CLASSES: { readonly [K in TButtonTag]: new () => HTMLElementTagNameMap[K] } = {
	div: HTMLDivElement,
}

/** Класс Button на теге `K`: нативный класс тега и своё элемента soldy. */
export type TButtonTagClass<K extends TButtonTag> = (new () => HTMLElementTagNameMap[K]) &
	TSoldyElementClass<IButton>

/** Классы, уже зарегистрированные на тегах: у тега класс один. */
const registered: { [K in TButtonTag]?: TButtonTagClass<K> } = {}

/**
 * Button на теге `tag` — `<div is="so-button-div">`: класс регистрируется при
 * первом вызове, и каждый следующий отдаёт тот же. Зовёт её разметка там, где
 * тег впервые нужен; класс нужен ей для проверки вида детали (`createDetail`),
 * потребителю — для `instanceof`.
 *
 * Своей логики у кнопки на теге нет: описание элемента — то же, что у
 * `<button is="so-button">` (`BUTTON`), повторяется только регистрация.
 */
export function registerButtonTag<K extends TButtonTag>(tag: K): TButtonTagClass<K> {
	const ready = registered[tag]

	if (ready) return ready

	const element = SoldyElement(NATIVE_CLASSES[tag], BUTTON)

	registered[tag] = element
	defineElement(`so-button-${tag}`, element, tag)

	return element
}

/**
 * Button из JS: нативный элемент тега (по умолчанию `<button is="so-button">`,
 * `TButtonElementProps<HTMLDivElement>` — `<div is="so-button-div">`), своё
 * элемента soldy (`ctrl`, `state`) и свойства пропов дескриптора вместе с
 * пропсами его плагинов (`aria_label`) — без тех, что у тега уже есть, и без
 * `HOST_PROPS` (`TSoldyElementProps`). У `div` своего `disabled` нет, и
 * `disabled` там — свойство пропа.
 */
export type TButtonElementProps<TNative extends HTMLElement = HTMLButtonElement> = TNative &
	ISoldyElement<IButton> &
	TSoldyElementProps<typeof ButtonDescriptor, TNative>
