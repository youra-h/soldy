/**
 * DateInput во Vue — проводка на настоящей разметке.
 *
 * Модель — набор, вставка, формат локали — проверяет ядро, клавиши и буфер
 * обмена — тест плагинов, протяжку мышью, выделение и настоящий буфер — браузер
 * (`playground/vue/browser/date-input.spec.ts`). Здесь важно, что выходы ядра
 * доезжают туда, куда должны: части и разделители — в ряд в порядке формата,
 * наборы части — на её узел, `dir` и `lang` — на ряд, значение — в скрытое
 * поле, а клавиши на настоящей разметке доходят до модели и возвращаются
 * `v-model`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { DateInput } from '@soldy-ui/vue'
import type { IDateInput } from '@soldy-ui/core'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function findAll(selector: string): HTMLElement[] {
	return [...document.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/** Часть по типу. */
const segment = (type: string) => find(`.s-date-input__segment[data-type="${type}"]`)

/** Узлы ряда по порядку: класс и текст. */
const rowContent = () =>
	[...find('.s-date-input__segments').children].map((node) => [node.className, node.textContent])

/** Нажатие клавиши с узла, как у пользователя: событие всплывает до корня. */
function press(from: Element, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	from.dispatchEvent(event)

	return event
}

/** Набрать строку с узла под фокусом документа. */
async function type(keys: string): Promise<void> {
	for (const key of keys) {
		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		press(active, key)
		await nextTick()
	}
}

/** Части и литералы даты по форматтеру поля — с теми же опциями. */
function formatted(locale: string, date: string): string[] {
	const [year, month, day] = date.split('-').map(Number)
	const formatter = new Intl.DateTimeFormat([locale, 'en-US'], {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		calendar: 'gregory',
		timeZone: 'UTC',
	})

	return formatter.formatToParts(Date.UTC(year, month - 1, day)).map(({ value }) => value)
}

describe('разметка', () => {
	it('ru: корень — группа, в ряду части и разделители в порядке формата', async () => {
		await render(() => h(DateInput, { locale: 'ru-RU', aria_label: 'Дата рождения' }))

		const root = find('.s-date-input')

		expect(root.getAttribute('role')).toBe('group')
		expect(root.getAttribute('aria-label')).toBe('Дата рождения')
		expect(root.dataset.invalid).toBe('false')
		expect(rowContent()).toEqual([
			['s-date-input__segment', 'дд'],
			['s-date-input__literal', '.'],
			['s-date-input__segment', 'мм'],
			['s-date-input__literal', '.'],
			['s-date-input__segment', 'гггг'],
		])
		expect(find('.s-date-input__segments').getAttribute('dir')).toBe('ltr')
		expect(find('.s-date-input__segments').getAttribute('lang')).toBe('ru-RU')
	})

	it('часть — spinbutton со своей остановкой Tab, разделитель скрыт от скринридера', async () => {
		await render(() => h(DateInput, { locale: 'ru-RU', value: '2026-05-12' }))

		const day = segment('day')

		expect(day.getAttribute('role')).toBe('spinbutton')
		expect(day.getAttribute('tabindex')).toBe('0')
		expect(day.getAttribute('aria-valuenow')).toBe('12')
		expect(day.getAttribute('aria-label')).toBe(
			new Intl.DisplayNames(['ru-RU', 'en-US'], { type: 'dateTimeField' }).of('day'),
		)
		expect(day.dataset.placeholder).toBe('false')
		expect(
			findAll('.s-date-input__literal').every(
				(node) => node.getAttribute('aria-hidden') === 'true',
			),
		).toBe(true)
		// Ни `contenteditable`, ни `inputmode`: часть нередактируемая
		expect(day.hasAttribute('contenteditable')).toBe(false)
		expect(day.hasAttribute('inputmode')).toBe(false)
	})

	it('ar-EG: ряд справа налево, цифры арабские, разделители с метками направления', async () => {
		await render(() => h(DateInput, { locale: 'ar-EG', value: '2026-05-12' }))

		expect(find('.s-date-input__segments').getAttribute('dir')).toBe('rtl')
		expect(rowContent().map(([, text]) => text)).toEqual(formatted('ar-EG', '2026-05-12'))
	})

	it('выключенное поле — частей вне порядка Tab, скрытое поле выключено', async () => {
		await render(() => h(DateInput, { disabled: true, name: 'birthday', value: '2026-05-12' }))

		expect(findAll('.s-date-input__segment[tabindex]')).toEqual([])
		expect(find('.s-date-input').dataset.disabled).toBe('true')
		expect(find('input[type="hidden"]').hasAttribute('disabled')).toBe(true)
	})

	it('дата вне min/max — data-invalid у корня и aria-invalid у частей', async () => {
		await render(() => h(DateInput, { value: '2026-05-12', max: '2026-01-01' }))

		expect(find('.s-date-input').dataset.invalid).toBe('true')
		expect(segment('year').getAttribute('aria-invalid')).toBe('true')
	})
})

describe('скрытое поле формы', () => {
	it('имя и значение — дата строкой; недописанная дата — пусто', async () => {
		await render(() => h(DateInput, { name: 'birthday', value: '2026-05-12' }))

		const hidden = find('input[type="hidden"]')

		expect(hidden.getAttribute('name')).toBe('birthday')
		expect(hidden).toHaveProperty('value', '2026-05-12')

		segment('day').focus()
		press(segment('day'), 'Delete')
		await nextTick()

		expect(hidden).toHaveProperty('value', '')
	})
})

describe('v-model', () => {
	it('набор с клавиатуры возвращает дату через update:value', async () => {
		const date = ref<string | undefined>()

		await render(() =>
			h(DateInput, {
				locale: 'ru-RU',
				value: date.value,
				'onUpdate:value': (value: string | undefined) => {
					date.value = value
				},
			}),
		)

		segment('day').focus()
		await type('12052026')

		expect(date.value).toBe('2026-05-12')
		expect(rowContent().map(([, text]) => text)).toEqual(['12', '.', '05', '.', '2026'])
		expect(document.activeElement).toBe(segment('year'))
	})

	it('значение снаружи — части из него', async () => {
		const date = ref<string | undefined>('2026-05-12')

		await render(() => h(DateInput, { locale: 'ru-RU', value: date.value }))

		date.value = '2027-01-02'
		await nextTick()

		expect(rowContent().map(([, text]) => text)).toEqual(['02', '.', '01', '.', '2027'])
	})
})

describe('смена локали', () => {
	it('часть меняет место, а её узел остаётся тем же', async () => {
		const locale = ref('ru-RU')

		await render(() => h(DateInput, { locale: locale.value, value: '2026-05-12' }))

		const day = segment('day')

		locale.value = 'en-US'
		await nextTick()

		expect(segment('day')).toBe(day)
		expect(rowContent().map(([, text]) => text)).toEqual(formatted('en-US', '2026-05-12'))
	})
})

describe('слоты', () => {
	it('leading и trailing получают инстанс поля; без слота обёртки нет', async () => {
		const seen: IDateInput[] = []

		await render(() =>
			h(
				DateInput,
				{ locale: 'ru-RU' },
				{
					trailing: ({ ctrl }: { ctrl: IDateInput }) => {
						seen.push(ctrl)

						return h('button', { class: 's-test-calendar' }, 'Календарь')
					},
				},
			),
		)

		expect(find('.s-date-input__trailing').querySelector('.s-test-calendar')).not.toBeNull()
		expect(document.querySelector('.s-date-input__leading')).toBeNull()
		expect(seen[0]?.locale).toBe('ru-RU')
	})

	it('клавиши кнопки в слоте — не поля', async () => {
		await render(() =>
			h(
				DateInput,
				{ value: '2026-05-12' },
				{ trailing: () => h('button', { class: 's-test-calendar' }, 'Календарь') },
			),
		)

		expect(press(find('.s-test-calendar'), 'ArrowUp').defaultPrevented).toBe(false)
	})
})
