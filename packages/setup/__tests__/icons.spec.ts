/**
 * Контракт пакета иконок.
 *
 * Пакет — не мешок SVG, а реализация списка ролей, которые нужны компонентам:
 * ровно как тема реализует классы, выпускаемые в разметку. Поэтому здесь два
 * рода проверок — механика реестра и conformance каждого пакета иконок.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MISSING_ICON, getIcon, hasIcon, resetIcons, useIcons } from '../protected/registry/icons'
import { ICON_ROLES, missingIconRoles } from '../content/icons/roles'
import type { TIconSource } from '../protected/registry'
import * as material from '@soldy-ui/icons-material'
import * as lucide from '@soldy-ui/icons-lucide'

const anIcon = { viewBox: '0 0 24 24', body: '<path d="M0 0h24v24H0z"/>' }

beforeEach(() => resetIcons())

afterEach(() => {
	resetIcons()
	vi.restoreAllMocks()
})

describe('реестр ролей', () => {
	it('отдаёт зарегистрированную иконку', () => {
		useIcons({ close: anIcon })

		expect(getIcon('close')).toBe(anIcon)
	})

	it('повторный вызов перекрывает роль, а не сбрасывает набор', () => {
		// Точечная подмена одной иконки не должна требовать пересборки набора
		const other = { viewBox: '0 0 16 16', body: '<circle r="8"/>' }

		useIcons({ close: anIcon, check: anIcon })
		useIcons({ close: other })

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
		useIcons({ nope: anIcon })
		resetIcons()
		getIcon('nope')

		expect(warn).toHaveBeenCalledTimes(2)
	})

	it('hasIcon отличает зарегистрированную роль от заглушки', () => {
		useIcons({ close: anIcon })

		expect(hasIcon('close')).toBe(true)
		expect(hasIcon('nope')).toBe(false)
	})

	it('undefined в наборе не затирает уже зарегистрированное', () => {
		useIcons({ close: anIcon })
		useIcons({ close: undefined })

		expect(getIcon('close')).toBe(anIcon)
	})
})

const PACKS: Record<string, Partial<Record<string, TIconSource>>> = { material, lucide }

describe.each(Object.entries(PACKS))('conformance пакета %s', (_, pack) => {
	it('закрывает все обязательные роли', () => {
		// Список ролей и есть контракт: добавили иконку в компонент — добавьте
		// роль, и этот тест сразу покажет, какие пакеты её не закрыли
		expect(missingIconRoles(pack)).toEqual([])
	})

	it('каждая иконка — данные, а не разметка с корневым <svg>', () => {
		// Корень строит адаптер: только так он может задать размер,
		// `aria-hidden` и классы
		for (const role of ICON_ROLES) {
			expect(pack[role]?.viewBox).toMatch(/^-?\d/)
			expect(pack[role]?.body).not.toContain('<svg')
		}
	})

	it('рисунок красит тема — заливкой, без своих fill и stroke', () => {
		// Тема красит глиф через `fill`: отметку CheckBox — цветом варианта,
		// звезду Rating — двумя слоями. Свой `fill` (исходники Material несут
		// fill="#1f1f1f") перебил бы её цвет, а обводка (Lucide рисует ею) ушла
		// бы мимо покраски — генераторы снимают первое и переводят второе в
		// контур
		for (const role of ICON_ROLES) {
			expect(pack[role]?.body).not.toMatch(/\s(fill|stroke)[\w-]*=/)
		}
	})

	it('роли не зависят от имён файлов: check_indeterminate → checkIndeterminate', () => {
		expect(pack.checkIndeterminate).toBeDefined()
	})
})
