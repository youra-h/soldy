/**
 * Локаль поддерева в Svelte.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `LocaleProvider` выше по дереву. Сборка компонента отдаёт источник
 * провайдера своему набору плагинов (`bundle.locale`), а плагины языка и имён
 * пишут компоненту тег и имена. Проверяется и сама проводка — источник в
 * наборе, — и строка на разметке: имя кнопки очистки Input собирается из
 * шаблона локали и имени поля. Смена локали доезжает до разметки без
 * перемонтирования, вложенный провайдер даёт поддереву свою, без провайдера —
 * английский. Параллельные серверные рендеры — `locale.server.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TInput } from '@soldy-ui/core'
import {
	enUS,
	extendLocale,
	ruRU,
	zhCN,
	TPluginBundle,
	type ILocaleSource,
} from '@soldy-ui/plugins'
import { Button, Input, type ButtonProps } from '@soldy-ui/svelte'
import Harness from './Locale.test.svelte'
import LocaleInput from './LocaleInput.test.svelte'
import { find, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Наборы, которые объявили кнопки, — по порядку объявления. */
function bundles(): { list: TPluginBundle[]; collect: (bundle: unknown) => void } {
	const list: TPluginBundle[] = []

	return {
		list,
		collect: (bundle) => {
			if (bundle instanceof TPluginBundle) list.push(bundle)
		},
	}
}

/** Набор объявляется на микрозадаче после сборки. */
const declared = () => Promise.resolve()

/** Тег локали источника набора. */
const tagOf = (source: ILocaleSource) => source.locale.tag

describe('LocaleProvider', () => {
	it('без провайдера — английская локаль, своя у набора', async () => {
		const first = bundles()
		const second = bundles()

		mount(Button, { onBundleCreate: first.collect } satisfies ButtonProps)
		mount(Button, { onBundleCreate: second.collect } satisfies ButtonProps)
		await declared()

		expect(tagOf(first.list[0].locale)).toBe(enUS.tag)
		expect(first.list[0].locale).not.toBe(second.list[0].locale)
	})

	it('источник провайдера — в наборе компонента, с первой сборки', async () => {
		const outer = bundles()

		mount(Harness, { locale: ruRU, onOuter: outer.collect })
		await declared()

		expect(outer.list).toHaveLength(1)
		expect(tagOf(outer.list[0].locale)).toBe(ruRU.tag)
	})

	it('смена локали провайдера — в тот же источник, без перемонтирования', async () => {
		const outer = bundles()
		const props = reactiveProps({ locale: ruRU, onOuter: outer.collect })
		const { container } = mount(Harness, props)

		await declared()

		const [bundle] = outer.list
		const source = bundle.locale
		const button = container.querySelector('.s-button')
		const changes: string[] = []

		source.events.on('change', (locale) => changes.push(locale.tag))

		props.locale = zhCN
		flushSync()

		// Набор тот же и объявлен один раз: компонент не пересобран
		expect(outer.list).toHaveLength(1)
		expect(bundle.locale).toBe(source)
		expect(tagOf(source)).toBe(zhCN.tag)
		expect(changes).toEqual([zhCN.tag])
		expect(container.querySelector('.s-button')).toBe(button)
	})

	it('вложенный провайдер даёт поддереву свою локаль', async () => {
		const outer = bundles()
		const inner = bundles()

		mount(Harness, {
			locale: ruRU,
			inner: enUS,
			onOuter: outer.collect,
			onInner: inner.collect,
		})
		await declared()

		expect(tagOf(outer.list[0].locale)).toBe(ruRU.tag)
		expect(tagOf(inner.list[0].locale)).toBe(enUS.tag)
		expect(inner.list[0].locale).not.toBe(outer.list[0].locale)
	})
})

/**
 * Строка на разметке — те же сценарии, что у React (`locale.spec.tsx`): имя
 * кнопки очистки поля пишет плагин имён по шаблону локали (`field.clear`).
 */
describe('LocaleProvider · строки на разметке', () => {
	/** Кнопка очистки поля внутри узла. */
	const clearOf = (scope: ParentNode) => find(scope, '.s-input__clear', HTMLButtonElement)

	it('без провайдера — английские строки', () => {
		const { container } = mount(Input, { clearable: true, name: 'Город' })

		expect(clearOf(container).getAttribute('aria-label')).toBe('Clear Город')
	})

	it('локаль провайдера — с первой отрисовки', () => {
		const { container } = mount(LocaleInput, { locale: ruRU })

		expect(clearOf(container).getAttribute('aria-label')).toBe('Очистить Город')
	})

	it('смена локали — новое имя без пересборки: инстанс и узел те же', () => {
		const ctrl = new TInput()
		const props = reactiveProps({ locale: enUS, ctrl })
		const { container } = mount(LocaleInput, props)
		const button = clearOf(container)

		props.locale = ruRU
		flushSync()

		expect(clearOf(container)).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Очистить Город')

		props.locale = extendLocale(zhCN, { translations: { field: { clear: '清空{name}' } } })
		flushSync()

		expect(button.getAttribute('aria-label')).toBe('清空Город')
	})

	it('вложенный провайдер даёт поддереву свою локаль', () => {
		const { container } = mount(LocaleInput, { locale: ruRU, inner: enUS })

		expect(
			clearOf(find(container, '.s-test-outer', HTMLElement)).getAttribute('aria-label'),
		).toBe('Очистить Город')
		expect(
			clearOf(find(container, '.s-test-inner', HTMLElement)).getAttribute('aria-label'),
		).toBe('Clear Город')
	})
})
