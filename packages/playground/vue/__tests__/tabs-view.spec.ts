/**
 * Геометрия активного таба не зависит от вида табов.
 *
 * `TTabsViewPlugin` — плагин темы oren (`@soldy-ui/theme-oren/setup`, ставит его
 * `useTheme` в `__tests__/setup.ts`). Он пишет на список переменные места и
 * длины активного таба (`--active-tab-*`) и разрыва линии (`--gap-*`), а после
 * монтирования ставит `--ready-animation`. Раньше он делал это только для видов
 * `line` и `outline`, то есть знал имена видов. Значения вида теперь объявляет
 * тема, и у табов без `view` модификатора нет вовсе — а полоса нужна именно им:
 * вид блока по умолчанию у oren `line`. Поэтому плагин пишет обе пары всегда, а
 * какая нужна виду, решает тема.
 *
 * Сами значения в jsdom нулевые — раскладки нет, — проверяется, что
 * переменные записаны. Что полоса встаёт под активный таб, проверяет браузерный
 * прогон (`playground/vue/browser/tabs-layout.spec.ts`), что карточка
 * `contained` переезжает переходом, — `playground/vue/browser/tabs-contained.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { TTabs } from '@soldy-ui/core'
import { TPluginBundle, TTabsActiveTabPlugin } from '@soldy-ui/plugins'
import { Tabs, TabsItem } from '@soldy-ui/vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Табы из слота — строковым шаблоном, плоскими именами. */
const render = async (attrs: string, setup: () => Record<string, unknown> = () => ({})) => {
	wrapper = mount(
		{
			components: { Tabs, TabsItem },
			setup,
			template: `
				<Tabs ${attrs}>
					<TabsItem value="a" text="Первый" active />
					<TabsItem value="b" text="Второй" />
				</Tabs>
			`,
		},
		{ attachTo: document.body },
	)

	await nextFrame()
	await nextFrame()
}

const list = (): HTMLElement => {
	const found = document.querySelector('.s-tabs__list')

	if (!(found instanceof HTMLElement)) throw new Error('списка табов нет')

	return found
}

/** Строка таба по порядку; клик по ней активирует таб. */
const row = (index: number): HTMLElement => {
	const found = document.querySelectorAll('[role="tab"]')[index]

	if (!(found instanceof HTMLElement)) throw new Error(`таба ${index} нет`)

	return found
}

describe('геометрия активного таба без знания о виде', () => {
	it.each([
		['без view', ''],
		['с view темы', 'view="cards"'],
	])('%s: переменные места и разрыва записаны, анимация включена', async (_, attrs) => {
		await render(attrs)

		const style = list().style

		expect(style.getPropertyValue('--active-tab-pos')).not.toBe('')
		expect(style.getPropertyValue('--active-tab-size')).not.toBe('')
		expect(style.getPropertyValue('--gap-pos')).not.toBe('')
		expect(style.getPropertyValue('--gap-size')).not.toBe('')
		expect(document.querySelector('.s-tabs')?.classList).toContain('s-tabs--ready-animation')
	})
})

/**
 * Признак переезда (`--active-tab-moving`) — по каждой записи геометрии: тест
 * слушает тот же `change:active-tab`, что и плагин темы, и подписан позже
 * него (`bundle:create` приходит после сборки набора), поэтому застаёт список
 * сразу после записи. Переходов в jsdom нет, и признак снимается кадром позже.
 */
describe('признак переезда', () => {
	it('ставит смена активного таба, а не первая запись и не смена вида; снимается кадром позже', async () => {
		const tabs = new TTabs()
		const writes: string[] = []

		tabs.events.on('bundle:create', (bundle: unknown) => {
			if (!(bundle instanceof TPluginBundle)) return

			bundle.get(TTabsActiveTabPlugin)?.events.on('change:active-tab', (offset) => {
				if (offset) writes.push(offset.listEl.style.getPropertyValue('--active-tab-moving'))
			})
		})

		await render(':ctrl="tabs"', () => ({ tabs }))

		// Первая запись — на монтировании, без признака
		expect(writes).toEqual([''])

		row(1).click()

		expect(writes).toEqual(['', '1'])
		expect(list().style.getPropertyValue('--active-tab-moving')).toBe('1')

		await nextFrame()

		expect(list().style.getPropertyValue('--active-tab-moving')).toBe('')

		// Тот же таб, другой вид — пересчёт без признака
		tabs.view = 'outline'

		expect(writes).toEqual(['', '1', ''])
	})
})
