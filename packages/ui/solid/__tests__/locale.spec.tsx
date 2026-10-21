/**
 * Локаль поддерева в Solid.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `LocaleProvider` выше по дереву. Сборка компонента отдаёт источник
 * провайдера своему набору плагинов (`bundle.locale`), а плагины языка и имён
 * пишут компоненту тег и имена. Проверяется и сама проводка — источник в
 * наборе, — и строка на разметке: имя кнопки очистки Input собирается из
 * шаблона локали и имени поля. Смена локали доезжает до разметки без
 * перемонтирования, вложенный провайдер даёт поддереву свою, без провайдера —
 * английский. Язык — тоже локали: дни недели календаря меняются на лету.
 * Параллельные серверные рендеры — `locale.server.spec.tsx`.
 */

import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { TInput } from '@soldy-ui/core'
import {
	enUS,
	extendLocale,
	ruRU,
	zhCN,
	TPluginBundle,
	type ILocaleSource,
	type TLocale,
} from '@soldy-ui/plugins'
import { Button, Calendar, Input, LocaleProvider } from '@soldy-ui/solid'
import { find, mount } from './mount'

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
		const button = container.querySelector('.so-button')
		const changes: string[] = []

		source.events.on('change', (next) => changes.push(next.tag))

		setLocale(zhCN)

		// Набор тот же и объявлен один раз: компонент не пересобран
		expect(outer.list).toHaveLength(1)
		expect(bundle.locale).toBe(source)
		expect(tagOf(source)).toBe(zhCN.tag)
		expect(changes).toEqual([zhCN.tag])
		expect(container.querySelector('.so-button')).toBe(button)
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

/**
 * Строка на разметке — те же сценарии, что у React (`locale.spec.tsx`): имя
 * кнопки очистки поля пишет плагин имён по шаблону локали (`field.clear`).
 */
describe('LocaleProvider · строки на разметке', () => {
	/** Имя кнопки очистки поля внутри узла. */
	const clearName = (scope: ParentNode) =>
		find(scope, '.so-input__clear', HTMLButtonElement).getAttribute('aria-label')

	/** Поле под провайдером локали — сигнала `locale`. */
	const field = (locale: () => TLocale, ctrl?: TInput) => (
		<LocaleProvider locale={locale()}>
			<Input ctrl={ctrl} clearable name="Город" />
		</LocaleProvider>
	)

	it('без провайдера — английские строки', () => {
		const { container } = mount(() => <Input clearable name="Город" />)

		expect(clearName(container)).toBe('Clear Город')
	})

	it('локаль провайдера — с первой отрисовки', () => {
		const { container } = mount(() => field(() => ruRU))

		expect(clearName(container)).toBe('Очистить Город')
	})

	it('смена локали — новое имя без пересборки: инстанс и узел те же', () => {
		const ctrl = new TInput()
		const [locale, setLocale] = createSignal<TLocale>(enUS)
		const { container } = mount(() => field(locale, ctrl))
		const button = find(container, '.so-input__clear', HTMLButtonElement)

		setLocale(ruRU)

		expect(find(container, '.so-input__clear', HTMLButtonElement)).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Очистить Город')

		setLocale(extendLocale(zhCN, { translations: { field: { clear: '清空{name}' } } }))

		expect(button.getAttribute('aria-label')).toBe('清空Город')
	})

	it('вложенный провайдер даёт поддереву свою локаль', () => {
		const { container } = mount(() => (
			<LocaleProvider locale={ruRU}>
				<div class="so-test-outer">
					<Input clearable name="Город" />
				</div>
				<LocaleProvider locale={enUS}>
					<div class="so-test-inner">
						<Input clearable name="Город" />
					</div>
				</LocaleProvider>
			</LocaleProvider>
		))

		expect(clearName(find(container, '.so-test-outer', HTMLElement))).toBe('Очистить Город')
		expect(clearName(find(container, '.so-test-inner', HTMLElement))).toBe('Clear Город')
	})
})

/**
 * Язык — тег локали поддерева: подписи календаря и первый день недели пишет
 * плагин языка на каждую смену, и сетка та же — календарь не пересобран.
 */
describe('LocaleProvider · язык', () => {
	/** Подписи колонок календаря по порядку. */
	const weekdays = () =>
		[...document.querySelectorAll('.so-calendar__weekday')].map((cell) =>
			cell.textContent?.trim(),
		)

	/**
	 * Короткие имена недели языка `locale`, с первого дня `first` (2026-09-20 —
	 * воскресенье): у `en-US` и `ru-RU` подпись колонки — короткое имя.
	 */
	const week = (locale: string, first: number) => {
		const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })

		return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
			short.format(Date.UTC(2026, 8, 20 + first + offset)),
		)
	}

	it('смена локали меняет дни недели календаря на лету', () => {
		const [locale, setLocale] = createSignal<TLocale>(enUS)
		const { container } = mount(() => (
			<LocaleProvider locale={locale()}>
				<Calendar months={['2026-09-01']} />
			</LocaleProvider>
		))
		const grid = find(container, '.so-calendar__grid', HTMLElement)

		expect(weekdays()).toEqual(week('en-US', 0))

		setLocale(ruRU)

		expect(find(container, '.so-calendar__grid', HTMLElement)).toBe(grid)
		expect(weekdays()).toEqual(week('ru-RU', 1))
	})
})
