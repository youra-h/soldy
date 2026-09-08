/**
 * Контракт пакета иконок.
 *
 * Пакет — не мешок SVG, а реализация списка ролей, которые нужны компонентам:
 * ровно как тема реализует классы, выпускаемые в разметку. Поэтому здесь два
 * рода проверок — механика реестра и conformance пакета `material`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
	ICON_ROLES,
	MISSING_ICON,
	getIcon,
	hasIcon,
	missingIconRoles,
	resetIcons,
	setIcons,
} from '../common/icons'
import * as material from '@soldy/icons-material'

const anIcon = { viewBox: '0 0 24 24', body: '<path d="M0 0h24v24H0z"/>' }

beforeEach(() => resetIcons())

afterEach(() => {
	resetIcons()
	vi.restoreAllMocks()
})

describe('реестр ролей', () => {
	it('отдаёт зарегистрированную иконку', () => {
		setIcons({ close: anIcon })

		expect(getIcon('close')).toBe(anIcon)
	})

	it('повторный вызов перекрывает роль, а не сбрасывает набор', () => {
		// Точечная подмена одной иконки не должна требовать пересборки набора
		const other = { viewBox: '0 0 16 16', body: '<circle r="8"/>' }

		setIcons({ close: anIcon, check: anIcon })
		setIcons({ close: other })

		expect(getIcon('close')).toBe(other)
		expect(getIcon('check')).toBe(anIcon)
	})

	it('незарегистрированная роль даёт заглушку, а не исключение', () => {
		// Из-за одной иконки не должно падать всё приложение
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		expect(getIcon('nope')).toBe(MISSING_ICON)
	})

	it('предупреждает один раз, а не на каждую отрисовку', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		getIcon('nope')
		getIcon('nope')
		getIcon('nope')

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('предупреждение возвращается, если роль потом зарегистрировали и сняли', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		getIcon('nope')
		setIcons({ nope: anIcon })
		resetIcons()
		getIcon('nope')

		expect(warn).toHaveBeenCalledTimes(2)
	})

	it('hasIcon отличает зарегистрированную роль от заглушки', () => {
		setIcons({ close: anIcon })

		expect(hasIcon('close')).toBe(true)
		expect(hasIcon('nope')).toBe(false)
	})

	it('undefined в наборе не затирает уже зарегистрированное', () => {
		setIcons({ close: anIcon })
		setIcons({ close: undefined })

		expect(getIcon('close')).toBe(anIcon)
	})
})

describe('conformance пакета material', () => {
	it('закрывает все обязательные роли', () => {
		// Список ролей и есть контракт: добавили иконку в компонент — добавьте
		// роль, и этот тест сразу покажет, какие пакеты её не закрыли
		expect(missingIconRoles(material)).toEqual([])
	})

	it('каждая иконка — данные, а не разметка с корневым <svg>', () => {
		// Корень строит адаптер: только так он может задать размер,
		// `aria-hidden` и классы
		for (const role of ICON_ROLES) {
			const icon = (material as Record<string, { viewBox: string; body: string }>)[role]

			expect(icon.viewBox).toMatch(/^-?\d/)
			expect(icon.body).not.toContain('<svg')
		}
	})

	it('цвет не зашит — иконка наследует currentColor', () => {
		// Исходники Material несут fill="#1f1f1f"; генератор его снимает,
		// иначе иконка не подхватит цвет текста
		for (const role of ICON_ROLES) {
			const icon = (material as Record<string, { body: string }>)[role]

			expect(icon.body).not.toMatch(/fill="#/)
		}
	})

	it('роли не зависят от имён файлов: check_indeterminate → checkIndeterminate', () => {
		expect(material.checkIndeterminate).toBeDefined()
	})
})
