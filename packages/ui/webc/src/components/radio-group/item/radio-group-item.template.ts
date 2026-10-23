/**
 * Шаблон радио.
 *
 * Корень — сам `<label is="so-radio-group-item">`: клик по подписи выбирает
 * радио, а подпись становится его доступным именем. Классы, `attrs` (`dir`) и
 * `dataset` (`data-selected`, `data-disabled`) раскладывает на него база
 * (`ElementBase`). Здесь — поле, кольцо с точкой и текст подписи, как у Vue.
 *
 * - Поле — нативный `<input type="radio">`, узел поля корня: на него база
 *   переносит статические атрибуты разметки корня (`id` для `<label for>`
 *   снаружи, `aria-label`, `data-*`), а шаблон кладёт `aria` ядра
 *   (`ownerAttributes`) и нативные `name`, `value` и `disabled` — ARIA-дублей
 *   им ядро не пишет. Группировку по общему `name` (его раздаёт плагин группы),
 *   стрелки по кругу, пропуск выключенных, одну остановку Tab и участие в
 *   форме даёт браузер. Стоит перед кольцом: кольцо фокуса тема рисует
 *   соседним селектором от поля.
 * - Отметку сообщает нативный `checked` — свойство узла: шаблон пишет его на
 *   смену активности и только если узел с ней расходится. Выбор пользователя
 *   приходит `change` поля: браузер уже отметил радио и снял отметку с соседа,
 *   коллекции остаётся сделать его активным — через контекст элемента фасада
 *   текущей связки. Выбор, в котором коллекция отказала, к модели возвращает
 *   плагин группы (`TRadioGroupCheckedPlugin`).
 * - Кольцо и точка — декор без текста. Подпись — только слот `default`:
 *   текста у радио нет. Вокруг слота нет пробелов: пустую обёртку тема прячет
 *   по `:empty`.
 *
 * Scope у слотов нет, как у всех слотов Web Components: отметку подпись берёт
 * у элемента (`el.state.active`).
 */

import type { IRadioGroupItem, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../../adapter'

/** Поле каждого радио — одно на всё время жизни элемента. */
const fields = new WeakMap<HTMLElement, HTMLInputElement>()

/** Нативный атрибут поля по значению: нет значения — атрибута нет. */
function attribute(field: HTMLInputElement, name: string, value: unknown): void {
	if (value === undefined || value === null) field.removeAttribute(name)
	else field.setAttribute(name, String(value))
}

export const radioGroupItemTemplate: ITemplate<IRadioGroupItem, TRadioGroupItemCollectionFacade> = {
	create: (root, ctx) => {
		const { ownerDocument } = root
		const field = ownerDocument.createElement('input')
		const control = ownerDocument.createElement('span')
		const indicator = ownerDocument.createElement('span')
		const text = ownerDocument.createElement('span')

		field.className = 'so-radio-group-item__input'
		field.type = 'radio'
		control.className = 'so-radio-group-item__control'
		indicator.className = 'so-radio-group-item__indicator'
		text.className = 'so-radio-group-item__text'
		control.appendChild(indicator)
		root.append(field, control, text)
		fields.set(root, field)

		// Выбор пользователя — единственный путь к коллекции: плагина ввода у
		// радио нет, и `change` поля разметка отдаёт ей сама, как `@change` у Vue
		field.addEventListener('change', () => {
			const context = ctx.facade?.context

			if (context) context.adapters.activation.active = true
		})

		return {
			slots: { default: { mode: 'append', node: text } },
			control: field,
		}
	},

	bindings: [
		// Нативные атрибуты поля фиксированного тега — проводка разметки
		bind(['name', 'value', 'disabled'], ({ root, state }) => {
			const field = fields.get(root)

			if (!field) return

			attribute(field, 'name', state.name)
			attribute(field, 'value', state.value)
			field.disabled = state.disabled === true
		}),

		bind('aria', ({ root, state }) => {
			const field = fields.get(root)

			if (field) ownerAttributes(field, state.aria)
		}),

		bind('active', ({ root, state }) => {
			const field = fields.get(root)
			const checked = state.active === true

			// Свойство узла — только если он разошёлся с моделью: после клика
			// браузер уже отметил радио сам
			if (field && field.checked !== checked) field.checked = checked
		}),
	],
}
