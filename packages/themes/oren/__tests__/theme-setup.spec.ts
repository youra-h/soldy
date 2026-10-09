import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TTable, TTabs } from '@soldy-ui/core'
import { resolveRegisteredPlugins, useTheme } from '@soldy-ui/setup'
import oren, { TTableHeadPlugin, TTabsViewPlugin } from '../setup'

/**
 * Поведение темы: `@soldy-ui/theme-oren/setup` ставит плагины, данные которых
 * читает её CSS. Полосу под активным табом рисует `_tabs.scss` по переменным
 * `TTabsViewPlugin` — без регистрации её нет. Отступ прокрутки к фокусу под
 * закреплённой шапкой Table `_table.scss` берёт из высоты шапки, которую пишет
 * `TTableHeadPlugin`.
 */

let dispose: (() => void) | null = null

afterEach(() => {
	dispose?.()
	dispose = null
})

describe('тема oren · регистрации', () => {
	it('ставит TTabsViewPlugin всем Tabs, в том числе вложенным', () => {
		dispose = useTheme(oren)

		const ctors = (context?: { embedded?: string }) =>
			resolveRegisteredPlugins(new TTabs(), context).map(({ ctor }) => ctor)

		expect(ctors()).toContain(TTabsViewPlugin)
		expect(ctors({ embedded: 'panel.tabs' })).toContain(TTabsViewPlugin)
	})

	it('ставит TTableHeadPlugin всем Table, в том числе вложенным', () => {
		dispose = useTheme(oren)

		const ctors = (context?: { embedded?: string }) =>
			resolveRegisteredPlugins(new TTable(), context).map(({ ctor }) => ctor)

		expect(ctors()).toEqual([TTableHeadPlugin])
		expect(ctors({ embedded: 'panel.table' })).toEqual([TTableHeadPlugin])
	})

	it('другим компонентам плагины темы не ставит', () => {
		dispose = useTheme(oren)

		expect(resolveRegisteredPlugins(new TButton())).toEqual([])
		expect(resolveRegisteredPlugins(new TTabs()).map(({ ctor }) => ctor)).not.toContain(
			TTableHeadPlugin,
		)
	})

	it('отмена снимает регистрации темы', () => {
		useTheme(oren)()

		expect(resolveRegisteredPlugins(new TTabs())).toEqual([])
		expect(resolveRegisteredPlugins(new TTable())).toEqual([])
	})
})
