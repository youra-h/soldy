/**
 * `aria` — набор атрибутов доступности компонента.
 *
 * Устроен как `classes`: живой объект в `TComponentView`, в который пишут
 * наследники, плагины и расширения коллекции. Разметка биндит один набор.
 * DOM здесь не участвует, поэтому всё проверяется без адаптеров.
 */

import { describe, it, expect } from 'vitest'
import {
	TAria,
	TButton,
	TControl,
	TComponentView,
	TIcon,
	TSpinner,
	TSkeleton,
	TTabsItem,
	TInput,
	TSelect,
	TCheckBox,
	TSwitch,
} from '../src'

describe('TAria · сам набор', () => {
	it('add ставит атрибут, get его отдаёт', () => {
		expect(new TAria().add('role', 'tab').get('role')).toBe('tab')
	})

	it('null и undefined снимают атрибут', () => {
		// Позволяет писать add('aria-disabled', disabled ? 'true' : null)
		// вместо ветвления на каждом вызове
		const aria = new TAria({ role: 'tab' })

		aria.add('role', null)

		expect(aria.has('role')).toBe(false)
	})

	it('change эмитится только при настоящем изменении', () => {
		const aria = new TAria()
		let count = 0

		aria.events.on('change', () => count++)

		aria.add('role', 'tab')
		aria.add('role', 'tab')
		aria.remove('nothing')

		expect(count).toBe(1)
	})

	it('remove эмитит change только если атрибут был', () => {
		const aria = new TAria({ role: 'tab' })
		let count = 0

		aria.events.on('change', () => count++)

		aria.remove('role')
		aria.remove('role')

		expect(count).toBe(1)
	})

	it('начальный набор пропускает null', () => {
		expect(new TAria({ role: 'tab', 'aria-disabled': null }).names).toEqual(['role'])
	})
})

describe('TComponentView.aria', () => {
	it('пуст: у визуального слоя самого по себе семантики нет', () => {
		expect(new TComponentView().aria.toObject()).toEqual({})
	})

	it('изменение набора порождает change:aria — единственный триггер пропа', () => {
		const view = new TComponentView()
		const seen: unknown[] = []

		view.events.on('change:aria', (value) => seen.push(value))
		view.aria.add('role', 'group')

		expect(seen).toEqual([{ role: 'group' }])
	})
})

describe('TComponentView.attrs', () => {
	it('пуст: у визуального слоя самого по себе нативных атрибутов нет', () => {
		expect(new TComponentView().attrs.toObject()).toEqual({})
	})

	it('изменение набора порождает change:attrs — единственный триггер пропа', () => {
		const view = new TComponentView()
		const seen: unknown[] = []

		view.events.on('change:attrs', (value) => seen.push(value))
		view.attrs.add('disabled', 'disabled')

		expect(seen).toEqual([{ disabled: 'disabled' }])
	})
})

describe('TControl.attrs · disabled', () => {
	it('button: нативный disabled, без aria-disabled рядом', () => {
		const control = new TControl({ tag: 'button', disabled: true })

		expect(control.attrs.get('disabled')).toBe('disabled')
		expect(control.aria.has('aria-disabled')).toBe(false)
	})

	it('fieldset: тоже нативный тег — тот же нативный атрибут', () => {
		const control = new TControl({ tag: 'fieldset', disabled: true })

		expect(control.attrs.get('disabled')).toBe('disabled')
		expect(control.aria.has('aria-disabled')).toBe(false)
	})

	it('div: aria-disabled, без нативного disabled — тега с ним нет', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		expect(control.attrs.has('disabled')).toBe(false)
		expect(control.aria.get('aria-disabled')).toBe('true')
	})

	it('смена тега переносит атрибут между наборами', () => {
		const control = new TControl({ tag: 'button', disabled: true })

		expect(control.attrs.get('disabled')).toBe('disabled')

		control.tag = 'div'

		expect(control.attrs.has('disabled')).toBe(false)
		expect(control.aria.get('aria-disabled')).toBe('true')

		control.tag = 'fieldset'

		expect(control.attrs.get('disabled')).toBe('disabled')
		expect(control.aria.has('aria-disabled')).toBe(false)
	})

	it('change:attrs эмитится только при настоящем изменении', () => {
		const control = new TControl({ tag: 'button', disabled: true })
		let count = 0

		control.events.on('change:attrs', () => count++)

		// Присвоение того же значения не меняет ни disabled, ни tag
		control.disabled = true
		control.tag = 'button'

		expect(count).toBe(0)

		control.disabled = false

		expect(count).toBe(1)
	})
})

describe('TControl.aria · aria-disabled', () => {
	it('не ставится на теге с собственным disabled', () => {
		const control = new TControl({ tag: 'button', disabled: true })

		// Нативный disabled сообщает состояние сам, aria-disabled был бы дублем
		expect(control.aria.has('aria-disabled')).toBe(false)
	})

	it('ставится там, где нативного disabled нет', () => {
		expect(new TControl({ tag: 'div', disabled: true }).aria.get('aria-disabled')).toBe('true')
	})

	it('исчезает вместе с disabled', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		control.disabled = false

		expect(control.aria.has('aria-disabled')).toBe(false)
	})

	it('пересчитывается при смене тега', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		expect(control.aria.get('aria-disabled')).toBe('true')

		control.tag = 'button'

		expect(control.aria.has('aria-disabled')).toBe(false)
	})
})

/**
 * Нативный `disabled` и `aria-disabled` решает тег, и они переезжают вместе с
 * ним. Тема читает одно значение на любом теге — `data-disabled` в `dataset`,
 * поэтому от тега оно не зависит и на его смену не пересчитывается.
 */
describe('TControl.dataset · data-disabled', () => {
	it('следует за disabled: "false" → "true" → "false"', () => {
		const control = new TControl()

		expect(control.dataset.get('disabled')).toBe('false')

		control.disabled = true
		expect(control.dataset.get('disabled')).toBe('true')

		control.disabled = false
		expect(control.dataset.get('disabled')).toBe('false')
	})

	it('disabled: true из конструктора стоит в наборе сразу', () => {
		expect(new TControl({ disabled: true }).dataset.get('disabled')).toBe('true')
	})

	it.each(['button', 'fieldset', 'a'])('одинаков на теге %s', (tag) => {
		expect(new TControl({ tag, disabled: true }).dataset.get('disabled')).toBe('true')
		expect(new TControl({ tag }).dataset.get('disabled')).toBe('false')
	})

	it('смена тега набор не трогает', () => {
		const control = new TControl({ tag: 'button', disabled: true })
		let count = 0

		control.events.on('change:dataset', () => count++)

		control.tag = 'a'
		control.tag = 'fieldset'

		expect(control.dataset.get('disabled')).toBe('true')
		expect(count).toBe(0)
	})

	it('TInput: то же — ни тег корня, ни <input> под aria на значение не влияют', () => {
		const input = new TInput({ tag: 'div', disabled: true })

		expect(input.dataset.get('disabled')).toBe('true')

		input.tag = 'span'
		expect(input.dataset.get('disabled')).toBe('true')

		input.disabled = false
		expect(input.dataset.get('disabled')).toBe('false')
	})

	it('отдельный набор: data-disabled не попадает ни в aria, ни в attrs', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		expect(control.aria.has('data-disabled')).toBe(false)
		expect(control.attrs.has('data-disabled')).toBe(false)
	})
})

describe('TInputControl.aria · aria-required', () => {
	it('TInput: не ставится без readonly — required у вложенного <input> нативный', () => {
		const input = new TInput({ required: true })

		// Нативный required сообщает состояние сам
		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('TInput: ставится на readonly-поле', () => {
		// readonly гасит нативную валидацию — required остался бы немым
		const input = new TInput({ required: true, readonly: true })

		expect(input.aria.get('aria-required')).toBe('true')
	})

	it('TInput: не ставится при required: false', () => {
		expect(new TInput({ readonly: true }).aria.has('aria-required')).toBe(false)
	})

	it('TInput: переключается сеттером в рантайме', () => {
		const input = new TInput({ readonly: true })

		expect(input.aria.has('aria-required')).toBe(false)

		input.required = true
		expect(input.aria.get('aria-required')).toBe('true')

		input.required = false
		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('TInput: пересчитывается при смене readonly', () => {
		const input = new TInput({ required: true })

		expect(input.aria.has('aria-required')).toBe(false)

		input.readonly = true
		expect(input.aria.get('aria-required')).toBe('true')

		input.readonly = false
		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('TInput: тег корня не влияет — aria стоит на вложенном <input>', () => {
		const plain = new TInput({ tag: 'div', required: true })
		const readonly = new TInput({ tag: 'div', required: true, readonly: true })

		expect(plain.aria.has('aria-required')).toBe(false)
		expect(readonly.aria.get('aria-required')).toBe('true')

		plain.tag = 'input'
		readonly.tag = 'input'

		expect(plain.aria.has('aria-required')).toBe(false)
		expect(readonly.aria.get('aria-required')).toBe('true')
	})

	it('TSelect: aria-required у комбобокса — на field, не на самом Select', () => {
		// Паттерн combobox описывает нативный `<input>` поля, а не корневой
		// `div` Select — туда же `TInput.field` ставит и required, и readonly
		const select = new TSelect({ required: true })

		expect(select.field.aria.get('aria-required')).toBe('true')
		expect(select.aria.has('aria-required')).toBe(false)
	})

	it('TCheckBox: рендерится в input[type=checkbox] — required у него нативный', () => {
		// Нативный required сообщает состояние сам, дублировать aria не нужно
		expect(new TCheckBox({ required: true }).aria.has('aria-required')).toBe(false)
	})

	it('TSwitch: рендерится в input[type=checkbox] — required у него нативный', () => {
		expect(new TSwitch({ required: true }).aria.has('aria-required')).toBe(false)
	})
})

describe('TInputControl.aria · aria-readonly', () => {
	it('TInput: не ставится — readonly у вложенного <input> нативный', () => {
		expect(new TInput({ readonly: true }).aria.has('aria-readonly')).toBe(false)
	})

	it('TInput: не появляется ни от сеттера, ни от смены тега корня', () => {
		const input = new TInput({ tag: 'div' })

		input.readonly = true
		expect(input.aria.has('aria-readonly')).toBe(false)

		input.tag = 'input'
		expect(input.aria.has('aria-readonly')).toBe(false)
	})

	it('TSelect: aria-readonly нет ни у field, ни у самого Select', () => {
		// Поле select-only readonly, но сообщает это нативный атрибут
		// вложенного `<input>` — ARIA-дубль рядом с ним не нужен
		const select = new TSelect({ readonly: true })

		expect(select.field.readonly).toBe(true)
		expect(select.field.aria.has('aria-readonly')).toBe(false)
		expect(select.aria.has('aria-readonly')).toBe(false)
	})

	it('TCheckBox: HTML не знает readonly у checkbox — атрибут ставится всегда', () => {
		expect(new TCheckBox({ readonly: true }).aria.get('aria-readonly')).toBe('true')
	})

	it('TSwitch: HTML не знает readonly у checkbox — атрибут ставится всегда', () => {
		expect(new TSwitch({ readonly: true }).aria.get('aria-readonly')).toBe('true')
	})
})

describe('TControl · тег элемента с aria', () => {
	/** `aria` уходит на вложенный `<input>`, `attrs` остаётся на корне. */
	class TNestedInputControl extends TControl {
		protected override get _ariaTag(): string {
			return 'input'
		}
	}

	it('aria-disabled решает тег элемента с aria, disabled в attrs — тег корня', () => {
		const control = new TNestedInputControl({ tag: 'div', disabled: true })

		// У корня-div нативного disabled нет, у <input> он есть — дубль не нужен
		expect(control.attrs.has('disabled')).toBe(false)
		expect(control.aria.has('aria-disabled')).toBe(false)

		control.tag = 'fieldset'

		// Смена корня переносит только нативную половину
		expect(control.attrs.get('disabled')).toBe('disabled')
		expect(control.aria.has('aria-disabled')).toBe(false)
	})
})

describe.each([
	['TInput', TInput],
	['TCheckBox', TCheckBox],
	['TSwitch', TSwitch],
] as const)('%s · disabled вложенного <input>', (_name, Ctor) => {
	// Нативный disabled на <input> проводит разметка: ядро не пишет ему
	// ARIA-дубль, а корню-div — атрибут, которого у div нет
	it('при disabled нет ни aria-disabled, ни disabled в attrs', () => {
		const control = new Ctor({ disabled: true })

		expect(control.aria.has('aria-disabled')).toBe(false)
		expect(control.attrs.has('disabled')).toBe(false)
	})

	it('не появляются ни от сеттера, ни от смены тега корня', () => {
		const control = new Ctor()

		control.disabled = true
		expect(control.aria.has('aria-disabled')).toBe(false)
		expect(control.attrs.has('disabled')).toBe(false)

		control.tag = 'span'
		expect(control.aria.has('aria-disabled')).toBe(false)
		expect(control.attrs.has('disabled')).toBe(false)
	})
})

describe('TButton.aria · role и tabindex', () => {
	it('на нативной кнопке не добавляет ничего', () => {
		const button = new TButton()

		expect(button.tag).toBe('button')
		expect(button.aria.toObject()).toEqual({})
	})

	it('на другом теге добавляет role и tabindex', () => {
		const button = new TButton({ tag: 'div' })

		// Без role скринридер не назовёт это кнопкой, без tabindex её нельзя
		// сфокусировать — а значит и активировать с клавиатуры
		expect(button.aria.get('role')).toBe('button')
		expect(button.aria.get('tabindex')).toBe('0')
	})

	it('disabled убирает элемент из порядка обхода', () => {
		const button = new TButton({ tag: 'div', disabled: true })

		expect(button.aria.has('tabindex')).toBe(false)
		expect(button.aria.get('aria-disabled')).toBe('true')
	})

	it('смена тега переключает набор в обе стороны', () => {
		const button = new TButton({ tag: 'span' })

		expect(button.aria.get('role')).toBe('button')

		button.tag = 'button'

		expect(button.aria.has('role')).toBe(false)
		expect(button.aria.has('tabindex')).toBe(false)
	})
})

describe('aria · контракт границы', () => {
	it('снимок — новый объект, а не ссылка на состояние', () => {
		const button = new TButton({ tag: 'div' })

		const first = button.aria.toObject()

		first.role = 'подделка'

		// Иначе потребитель мог бы незаметно испортить состояние компонента
		expect(button.aria.get('role')).toBe('button')
		expect(button.aria.toObject()).not.toBe(first)
	})

	it('valueOf отдаёт тот же снимок — его читает адаптер', () => {
		const button = new TButton({ tag: 'div' })

		expect(button.aria.valueOf()).toEqual(button.aria.toObject())
	})
})

describe('TIcon.aria · декоративная', () => {
	it('скрыта от скринридера', () => {
		// Иконка почти всегда дублирует соседний текст: «стрелка Развернуть»
		// вместо «Развернуть». Обратный случай решает TAriaPlugin — он снимает
		// aria-hidden, когда у иконки появилось имя
		expect(new TIcon().aria.toObject()).toEqual({ 'aria-hidden': 'true' })
	})
})

describe('TSpinner.aria · живая область', () => {
	it('объявлен как status', () => {
		// role="status" уже подразумевает aria-live="polite" и aria-atomic
		expect(new TSpinner().aria.get('role')).toBe('status')
	})

	it('имени по умолчанию нет: язык интерфейса ядру неизвестен', () => {
		// Строка вроде «Загрузка» приходит от потребителя через TAriaPlugin
		expect(new TSpinner().aria.has('aria-label')).toBe(false)
	})
})

describe('TSkeleton.aria · aria-busy', () => {
	it('помечен занятым, пока показан', () => {
		expect(new TSkeleton().aria.get('aria-busy')).toBe('true')
	})

	it('снимает пометку, когда заглушки нет', () => {
		const skeleton = new TSkeleton()

		skeleton.visible = false

		expect(skeleton.present).toBe(false)
		expect(skeleton.aria.has('aria-busy')).toBe(false)
	})
})

describe('TTabsItem · роль таба', () => {
	it('таб знает о себе, что он таб', () => {
		expect(new TTabsItem().aria.get('role')).toBe('tab')
	})

	it('связки с панелью в ядре нет — о панели знает коллекция', () => {
		const item = new TTabsItem({ text: 'Почта' })

		expect(item.aria.has('aria-controls')).toBe(false)
		expect(item.aria.has('id')).toBe(false)
	})
})

describe('TTabsItem.closeAria · имя кнопки закрытия', () => {
	it('содержит текст таба, чтобы кнопки были различимы', () => {
		// Пять «Close, кнопка» подряд в списке элементов скринридера выбрать
		// нельзя — поэтому имя собирается вместе с текстом
		const item = new TTabsItem({ text: 'Настройки', closable: true })

		expect(item.closeAria['aria-label']).toBe('Close Настройки')
	})

	it('без текста остаётся одно слово', () => {
		expect(new TTabsItem({ closable: true }).closeAria['aria-label']).toBe('Close')
	})

	it('слово переопределяется — язык интерфейса решает потребитель', () => {
		const item = new TTabsItem({ text: 'Почта', closeLabel: 'Закрыть' })

		expect(item.closeAria['aria-label']).toBe('Закрыть Почта')
	})

	it('следует за текстом таба', () => {
		const item = new TTabsItem({ text: 'Первый' })

		item.text = 'Второй'

		expect(item.closeAria['aria-label']).toBe('Close Второй')
	})

	it('отдельный набор: это имя вложенной кнопки, а не самого таба', () => {
		const item = new TTabsItem({ text: 'Почта' })

		expect(item.aria.has('aria-label')).toBe(false)
	})
})
