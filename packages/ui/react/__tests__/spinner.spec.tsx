/**
 * Spinner в React: живая область, имя и толщина кольца.
 *
 * Роль пишет ядро, имя — плагин доступного имени, толщину — плагин раскладки
 * пользовательским свойством CSS. Сценарии имени — те же, что у Vue
 * (`aria-name.spec.ts`).
 */

import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { TSpinner } from '@soldy-ui/core'
import { Spinner } from '@soldy-ui/react'
import { mount } from './mount'

describe('Spinner · живая область', () => {
	it('объявлен как живая область', () => {
		const el = mount(<Spinner />).root()

		expect(el.getAttribute('role')).toBe('status')
	})

	it('имени по умолчанию нет: язык интерфейса библиотеке неизвестен', () => {
		const el = mount(<Spinner />).root()

		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it('имя задаётся потребителем', () => {
		const el = mount(<Spinner aria_label="Загрузка" />).root()

		expect(el.getAttribute('aria-label')).toBe('Загрузка')
	})
})

describe('Spinner · разметка', () => {
	it('корень — span по умолчанию, содержимое children — внутри', () => {
		const el = mount(
			<Spinner>
				<b>Сохраняем…</b>
			</Spinner>,
		).root()

		expect(el.localName).toBe('span')
		expect(el.classList.contains('s-spinner')).toBe(true)
		expect(el.querySelector('b')?.textContent).toBe('Сохраняем…')
	})
})

/**
 * Толщину плагин кладёт пользовательским свойством: имя `--*` React ставит
 * как есть, без перевода в camelCase.
 */
describe('Spinner · толщина кольца', () => {
	const borderWidth = (el: HTMLElement) => el.style.getPropertyValue('--spinner-border-width')

	// Толщина, с которой спиннер собрали, приходит в инстанс без события, и
	// плагин раскладки берёт её у инстанса сам — иначе кольцо рисовалось бы
	// толщиной темы, пока толщину не поменяют.
	it('толщина из пропа стоит с монтирования', () => {
		const el = mount(<Spinner borderWidth={2} />).root()

		expect(borderWidth(el)).toBe('2px')
	})

	it('и толщина готового ctrl', () => {
		const el = mount(<Spinner ctrl={new TSpinner({ borderWidth: 5 })} />).root()

		expect(borderWidth(el)).toBe('5px')
	})

	it('смена borderWidth доходит до --spinner-border-width', () => {
		const { root, render } = mount(<Spinner borderWidth={2} />)

		render(<Spinner borderWidth={3} />)

		expect(borderWidth(root())).toBe('3px')
	})

	it('и смена через ctrl', () => {
		const ctrl = new TSpinner()
		const { root } = mount(<Spinner ctrl={ctrl} />)

		act(() => {
			ctrl.borderWidth = 4
		})

		expect(borderWidth(root())).toBe('4px')
	})

	// Число, равное автоматической толщине, — тоже заданная толщина. Геттер
	// `borderWidth` отдаёт итог, и пока обмен сверял с ним значение из
	// разметки, число до ядра не доходило: у `xl` кольцо становилось 2px.
	// Сценарий тот же, что у Vue (`spinner-border-width.spec.ts`).
	it('толщина, равная автоматической, переживает смену размера', () => {
		const { root, render } = mount(<Spinner />)

		render(<Spinner borderWidth={1} />)
		render(<Spinner borderWidth={1} size="xl" />)

		expect(borderWidth(root())).toBe('1px')
	})
})
