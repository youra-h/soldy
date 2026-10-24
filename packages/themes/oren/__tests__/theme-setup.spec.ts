import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TTable, TTabs, TToasts } from '@soldy-ui/core'
import { resolveRegisteredPlugins, useTheme } from '@soldy-ui/setup'
import { TTableHeadPlugin, TTabsViewPlugin, TToastsFrontPlugin } from '@soldy-ui/theme-base/setup'
import * as setup from '../setup'

/**
 * Поведение темы: `@soldy-ui/theme-oren/setup` ставит плагины, данные которых
 * читает её CSS, — плагины раскладки общего слоя тем
 * (`@soldy-ui/theme-base/setup`): своего `useTheme` у общего слоя нет. Полосу
 * под активным табом рисует `_tabs.scss` по переменным `TTabsViewPlugin` — без
 * регистрации её нет. Отступ прокрутки к фокусу под закреплённой шапкой Table
 * общий слой тем (`components/table.css`) берёт из высоты шапки, которую пишет
 * `TTableHeadPlugin`, а высоту задних тостов стопки (`components/toasts.css`)
 * — из высоты переднего от `TToastsFrontPlugin`, и `_toasts.scss` ведёт её
 * переходом.
 */

const oren = setup.default

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
})

describe('тема oren · регистрации', () => {
	it('ставит TTabsViewPlugin общего слоя всем Tabs, в том числе вложенным', () => {
		dispose = useTheme(oren)

		const ctors = (context?: { embedded?: string }) =>
			resolveRegisteredPlugins(new TTabs(), context).map(({ ctor }) => ctor)

		expect(ctors()).toContain(TTabsViewPlugin)
		expect(ctors({ embedded: 'panel.tabs' })).toContain(TTabsViewPlugin)
	})

	it('ставит TTableHeadPlugin общего слоя всем Table, в том числе вложенным', () => {
		dispose = useTheme(oren)

		const ctors = (context?: { embedded?: string }) =>
			resolveRegisteredPlugins(new TTable(), context).map(({ ctor }) => ctor)

		expect(ctors()).toEqual([TTableHeadPlugin])
		expect(ctors({ embedded: 'panel.table' })).toEqual([TTableHeadPlugin])
	})

	it('ставит TToastsFrontPlugin общего слоя всем Toasts', () => {
		dispose = useTheme(oren)

		expect(resolveRegisteredPlugins(new TToasts()).map(({ ctor }) => ctor)).toEqual([
			TToastsFrontPlugin,
		])
	})

	it('другим компонентам плагины темы не ставит', () => {
		dispose = useTheme(oren)

		expect(resolveRegisteredPlugins(new TButton())).toEqual([])
		expect(resolveRegisteredPlugins(new TTabs()).map(({ ctor }) => ctor)).not.toContain(
			TTableHeadPlugin,
		)
		expect(resolveRegisteredPlugins(new TTable()).map(({ ctor }) => ctor)).not.toContain(
			TToastsFrontPlugin,
		)
	})

	it('отмена снимает регистрации темы', () => {
		useTheme(oren)()

		expect(resolveRegisteredPlugins(new TTabs())).toEqual([])
		expect(resolveRegisteredPlugins(new TTable())).toEqual([])
		expect(resolveRegisteredPlugins(new TToasts())).toEqual([])
	})
})

describe('тема oren · поверхность ./setup', () => {
	// Классы плагинов отдаёт общий слой. Реэкспорт отсюда был бы вторым путём к
	// тем же классам — старым API рядом с новым
	it('отдаёт только объект темы', () => {
		expect(Object.keys(setup)).toEqual(['default'])
	})
})
