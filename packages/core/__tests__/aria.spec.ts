/**
 * `aria` — набор атрибутов доступности компонента.
 *
 * Устроен как `classes`: живой объект в `TComponentView`, в который пишут
 * наследники, плагины и расширения коллекции. Разметка биндит один набор.
 * DOM здесь не участвует, поэтому всё проверяется без адаптеров.
 */

import { describe, it, expect } from 'vitest'
import { TAria, TButton, TControl, TComponentView, TIcon, TSpinner, TSkeleton, TTabsItem } from '../src'

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
