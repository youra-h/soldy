import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TTabs } from '@soldy/core'
import { resolveRegisteredPlugins, useTheme } from '@soldy/setup'
import oren, { TTabsViewPlugin } from '../setup'

/**
 * Поведение темы: `@soldy/theme-oren/setup` ставит плагины, данные которых
 * читает её CSS. Полосу под активным табом рисует `_tabs.scss` по переменным
 * `TTabsViewPlugin` — без регистрации её нет.
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

	it('другим компонентам плагин табов не ставит', () => {
		dispose = useTheme(oren)

		expect(resolveRegisteredPlugins(new TButton())).toEqual([])
	})

	it('отмена снимает регистрации темы', () => {
		useTheme(oren)()

		expect(resolveRegisteredPlugins(new TTabs())).toEqual([])
	})
})
