/**
 * Локаль поддерева в Solid.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `LocaleProvider` выше по дереву. Сборка компонента отдаёт источник
 * провайдера своему набору плагинов (`bundle.locale`), а плагины языка и имён
 * пишут компоненту тег и имена. Компонентов со строками у Solid пока нет,
 * поэтому проверяется то, на чём они встанут: источник в наборе, смена на лету
 * без перемонтирования и вложенный провайдер. Без провайдера — английский.
 */

import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { enUS, ruRU, zhCN, TPluginBundle, type ILocaleSource } from '@soldy-ui/plugins'
import { Button, LocaleProvider } from '@soldy-ui/solid'
import { mount } from './mount'

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

		mount(() => <Button onBundleCreate={first.collect} />)
		mount(() => <Button onBundleCreate={second.collect} />)
		await declared()

		expect(tagOf(first.list[0].locale)).toBe(enUS.tag)
		expect(first.list[0].locale).not.toBe(second.list[0].locale)
	})

	it('источник провайдера — в наборе компонента, с первой сборки', async () => {
		const outer = bundles()

		mount(() => (
			<LocaleProvider locale={ruRU}>
				<Button onBundleCreate={outer.collect} />
			</LocaleProvider>
		))
		await declared()

		expect(outer.list).toHaveLength(1)
		expect(tagOf(outer.list[0].locale)).toBe(ruRU.tag)
	})

	it('смена локали провайдера — в тот же источник, без перемонтирования', async () => {
		const outer = bundles()
		const [locale, setLocale] = createSignal(ruRU)
		const { container } = mount(() => (
			<LocaleProvider locale={locale()}>
				<Button onBundleCreate={outer.collect} />
			</LocaleProvider>
		))

		await declared()

		const [bundle] = outer.list
		const source = bundle.locale
		const button = container.querySelector('.s-button')
		const changes: string[] = []

		source.events.on('change', (next) => changes.push(next.tag))

		setLocale(zhCN)

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

		mount(() => (
			<LocaleProvider locale={ruRU}>
				<Button text="outer" onBundleCreate={outer.collect} />
				<LocaleProvider locale={enUS}>
					<Button text="inner" onBundleCreate={inner.collect} />
				</LocaleProvider>
			</LocaleProvider>
		))
		await declared()

		expect(tagOf(outer.list[0].locale)).toBe(ruRU.tag)
		expect(tagOf(inner.list[0].locale)).toBe(enUS.tag)
		expect(inner.list[0].locale).not.toBe(outer.list[0].locale)
	})
})
