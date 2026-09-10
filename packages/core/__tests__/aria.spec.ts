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

describe('TInputControl.aria · aria-required', () => {
	it('не ставится на нативном теге без readonly', () => {
		const input = new TInput({ tag: 'input', required: true })

		// Нативный required сообщает состояние сам
		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('ставится на нативном теге, если он readonly', () => {
		// readonly гасит нативную валидацию — required остался бы немым
		const input = new TInput({ tag: 'input', required: true, readonly: true })

		expect(input.aria.get('aria-required')).toBe('true')
	})

	it('ставится там, где нативного required нет', () => {
		expect(new TInput({ tag: 'div', required: true }).aria.get('aria-required')).toBe('true')
	})

	it('не ставится при required: false', () => {
		const input = new TInput({ tag: 'div', required: false })

		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('переключается сеттером в рантайме', () => {
		const input = new TInput({ tag: 'div' })

		expect(input.aria.has('aria-required')).toBe(false)

		input.required = true
		expect(input.aria.get('aria-required')).toBe('true')

		input.required = false
		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('пересчитывается при смене readonly', () => {
		const input = new TInput({ tag: 'input', required: true })

		expect(input.aria.has('aria-required')).toBe(false)

		input.readonly = true
		expect(input.aria.get('aria-required')).toBe('true')
	})

	it('пересчитывается при смене тега', () => {
		const input = new TInput({ tag: 'div', required: true })

		expect(input.aria.get('aria-required')).toBe('true')

		input.tag = 'input'
		expect(input.aria.has('aria-required')).toBe(false)
	})

	it('TSelect: собственный тег — div, required у него не нативный', () => {
		// Select — не input и не select, поэтому aria-required ставится всегда
		expect(new TSelect({ required: true }).aria.get('aria-required')).toBe('true')
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
	it('не ставится на нативном теге', () => {
		const input = new TInput({ tag: 'input', readonly: true })

		expect(input.aria.has('aria-readonly')).toBe(false)
	})

	it('ставится там, где нативного readonly нет', () => {
		expect(new TInput({ tag: 'div', readonly: true }).aria.get('aria-readonly')).toBe('true')
	})

	it('не ставится при readonly: false', () => {
		expect(new TInput({ tag: 'div', readonly: false }).aria.has('aria-readonly')).toBe(false)
	})

	it('переключается сеттером в рантайме', () => {
		const input = new TInput({ tag: 'div' })

		input.readonly = true
		expect(input.aria.get('aria-readonly')).toBe('true')

		input.readonly = false
		expect(input.aria.has('aria-readonly')).toBe(false)
	})

	it('пересчитывается при смене тега', () => {
		const input = new TInput({ tag: 'div', readonly: true })

		expect(input.aria.get('aria-readonly')).toBe('true')

		input.tag = 'input'
		expect(input.aria.has('aria-readonly')).toBe(false)
	})

	it('TSelect: собственный тег — div, readonly у него не нативный', () => {
		expect(new TSelect({ readonly: true }).aria.get('aria-readonly')).toBe('true')
	})

	it('TCheckBox: HTML не знает readonly у checkbox — атрибут ставится всегда', () => {
		expect(new TCheckBox({ readonly: true }).aria.get('aria-readonly')).toBe('true')
	})

	it('TSwitch: HTML не знает readonly у checkbox — атрибут ставится всегда', () => {
		expect(new TSwitch({ readonly: true }).aria.get('aria-readonly')).toBe('true')
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
