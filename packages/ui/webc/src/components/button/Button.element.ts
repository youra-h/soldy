/**
 * `<button is="so-button">` — слой Button.
 *
 * Элемент — настоящая `<button>`, расширенная классом soldy (customized
 * built-in, см. `ElementBase`). Всё, что браузер делает для кнопки, он делает
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
 * `<div is="so-button-div">` — строка элемента ListBox, тега и пункта меню,
 * `<span is="so-button-span">` — строка опции Select. Имя — имя компонента и
 * тег через дефис. Описание элемента у всех тегов одно (`BUTTON`), отличается
 * только нативный класс, а тег ядро получает от элемента, как всегда: на `div`
 * и `span` оно пишет кнопке `role="button"`, `tabindex` и `aria-disabled`
 * вместо нативного `disabled`.
 *
 * Разметка вынесена в button.template.ts, жизненный цикл — в ElementBase.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementOf } from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

/** Описание элемента Button — одно на все его теги: дескриптор, шаблон и setup. */
const BUTTON = {
	descriptor: ButtonDescriptor,
	template: buttonTemplate,
	setup: setupButton,
}

export const TButtonElement = ElementBase(HTMLButtonElement, BUTTON)

defineElement('so-button', TButtonElement, 'button')

/**
 * Теги, на которых Button регистрируется ещё раз (`registerButtonTag`), —
 * сверх своего `button`. Тег здесь — значит, у кнопки на нём есть место в
 * разметке библиотеки: `div` — строка элемента ListBox, тега и пункта меню,
 * `span` — строка опции Select (под этот тег ядро пишет опции ARIA,
 * `TSelectItem._ariaTag`, как `tag="span"` у Vue).
 */
export type TButtonTag = 'div' | 'span'

/** Класс Button на теге `K`: нативный класс тега и своё элемента soldy. */
export type TButtonTagClass<K extends TButtonTag> = ReturnType<typeof variant<K>>

function variant<K extends TButtonTag>(Native: new () => HTMLElementTagNameMap[K]) {
	return ElementBase(Native, BUTTON)
}

/**
 * Регистрация Button на теге: класс на нативном классе тега создаётся и
 * регистрируется при первом обращении, каждое следующее отдаёт тот же — у тега
 * класс один. Тип сверяет нативный класс с тегом: класс чужого тега
 * (`registration('div', HTMLSpanElement)`) не компилируется.
 */
function registration<K extends TButtonTag>(
	tag: K,
	Native: new () => HTMLElementTagNameMap[K],
): () => TButtonTagClass<K> {
	let element: TButtonTagClass<K> | undefined

	return () => {
		if (!element) {
			element = variant(Native)
			defineElement(`so-button-${tag}`, element, tag)
		}

		return element
	}
}

/** Регистрация каждого тега: тег без неё не компилируется (`TButtonTag`). */
const REGISTRATIONS: { readonly [K in TButtonTag]: () => TButtonTagClass<K> } = {
	div: registration('div', HTMLDivElement),
	span: registration('span', HTMLSpanElement),
}

/**
 * Button на теге `tag` — `<div is="so-button-div">`, `<span is="so-button-span">`:
 * класс регистрируется при первом вызове, и каждый следующий отдаёт тот же.
 * Зовёт её разметка там, где тег впервые нужен; класс нужен ей для проверки
 * вида детали (`createDetail`), потребителю — для `instanceof`.
 *
 * Своей логики у кнопки на теге нет: описание элемента — то же, что у
 * `<button is="so-button">` (`BUTTON`), повторяется только регистрация.
 */
export function registerButtonTag<K extends TButtonTag>(tag: K): TButtonTagClass<K> {
	return REGISTRATIONS[tag]()
}

/**
 * Button из JS: нативный элемент тега (по умолчанию `<button is="so-button">`,
 * `TButtonElementProps<HTMLDivElement>` — `<div is="so-button-div">`,
 * `TButtonElementProps<HTMLSpanElement>` — `<span is="so-button-span">`), своё
 * элемента soldy (`ctrl`, `state`) и свойства пропов дескриптора вместе с
 * пропсами его плагинов (`aria_label`) — без тех, что у тега уже есть, и без
 * `HOST_PROPS` (`TElementProps`). У `div` и `span` своего `disabled`
 * нет, и `disabled` там — свойство пропа.
 */
export type TButtonElementProps<TNative extends HTMLElement = HTMLButtonElement> = TElementOf<
	TNative,
	typeof ButtonDescriptor,
	IButton
>
