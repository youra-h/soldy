/**
 * Кнопка закрытия тега — сосед строки, а не её потомок.
 *
 * Пока у набора включён выбор, строка тега — `role="option"`. Потомки опции
 * для скринридера презентационны, а имя опции считается из содержимого. Пока
 * крестик лежал внутри строки, скринридер не видел его кнопкой, а подпись
 * приклеивал к названию: вместо «Настройки» звучало «Настройки Close
 * Настройки». Разметка одна на все режимы, поэтому и в `mode="none"`
 * (`role="listitem"`) крестик — сосед строки.
 *
 * Что вид закрываемого тега остался прежним, проверяет браузерный прогон
 * (`playground/vue/browser/tags-close.spec.ts`): в jsdom раскладки нет.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Tags, TagsItem } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Теги из слота — строковым шаблоном: точка в нём не работает, берём плоские имена. */
const render = async (template: string) => {
	wrapper = mount({ components: { Tags, TagsItem }, template }, { attachTo: document.body })

	await nextTick()
}

/** Закрываемые теги в режиме выбора и без него: разметка обязана быть одной. */
const CLOSABLE = {
	multiple: `
		<Tags closable mode="multiple">
			<TagsItem value="settings" text="Настройки" selected />
			<TagsItem value="mail" text="Почта" />
		</Tags>
	`,
	none: `
		<Tags closable>
			<TagsItem value="settings" text="Настройки" />
			<TagsItem value="mail" text="Почта" />
		</Tags>
	`,
}

const ROLES = { multiple: 'option', none: 'listitem' } as const

const MODES = ['multiple', 'none'] as const

/** Строка тега — носитель его роли. */
const rows = () => [...document.querySelectorAll('.s-tags-item > .s-button:first-child')]

/** Элемент тега по тексту строки; нет его — тест падает здесь. */
const item = (text: string): Element => {
	const found = [...document.querySelectorAll('.s-tags-item')].find(
		(candidate) => candidate.firstElementChild?.textContent?.trim() === text,
	)

	if (!found) throw new Error(`тега «${text}» нет`)

	return found
}

const rowOf = (text: string): Element => {
	const row = item(text).firstElementChild

	if (!row) throw new Error(`у тега «${text}» нет строки`)

	return row
}

const closeOf = (text: string): HTMLElement => {
	const close = item(text).querySelector('.s-tags-item__close')

	if (!(close instanceof HTMLElement)) throw new Error(`у тега «${text}» нет кнопки закрытия`)

	return close
}

describe.each(MODES)('разметка, mode="%s"', (mode) => {
	it('у строки тега нет интерактивного потомка', async () => {
		await render(CLOSABLE[mode])

		expect(rows()).toHaveLength(2)

		for (const row of rows()) {
			expect(row.getAttribute('role')).toBe(ROLES[mode])
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе тега сразу после строки', async () => {
		await render(CLOSABLE[mode])

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe(ROLES[mode])
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('s-tags-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое тега не входит', async () => {
		await render(CLOSABLE[mode])

		const row = rowOf('Настройки')

		expect(row.textContent?.trim()).toBe('Настройки')
		expect(row.querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})
})

describe('без closable', () => {
	it('кнопки нет, в элементе одна строка', async () => {
		await render(`<Tags><TagsItem value="a" text="A" /></Tags>`)

		expect(document.querySelector('.s-tags-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})
})

/**
 * Пилюлю рисует элемент тега целиком: строка — только содержимое, иначе фон и
 * состояния не покрыли бы кнопку закрытия. Вид тема читает с класса набора,
 * состояние — с `data-*` элемента.
 */
describe('вид — у пилюли, а не у строки', () => {
	it('строка вида не рисует, вид набора — классом на наборе', async () => {
		await render(`
			<Tags closable view="outlined">
				<TagsItem value="a" text="A" />
			</Tags>
		`)

		expect(document.querySelector('.s-tags')?.classList.contains('s-tags--outlined')).toBe(true)
		expect(rowOf('A').classList.contains('s-button--a-none')).toBe(true)
	})

	it('выбор отмечен на элементе тега, а строка его не несёт', async () => {
		await render(CLOSABLE.multiple)

		expect(item('Настройки').getAttribute('data-selected')).toBe('true')
		expect(rowOf('Настройки').hasAttribute('data-selected')).toBe(false)
		expect(rowOf('Настройки').getAttribute('aria-selected')).toBe('true')
	})
})

describe('кнопка ведёт себя как раньше', () => {
	const mountItems = async () => {
		wrapper = mount(Tags, {
			props: {
				closable: true,
				mode: 'multiple',
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
					{ value: 'c', text: 'C' },
				],
			},
			attachTo: document.body,
		})

		await nextTick()
	}

	it('клик закрывает тег и не выбирает его', async () => {
		await mountItems()

		closeOf('B').click()
		await nextTick()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(rows().map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'false'])
	})

	it('клик по строке по-прежнему выбирает тег', async () => {
		await mountItems()
		;(rowOf('B') as HTMLElement).click()
		await nextTick()

		expect(rowOf('B').getAttribute('aria-selected')).toBe('true')
		expect(rows()).toHaveLength(3)
	})

	it('у выключенного тега выключена и кнопка — строка её больше не накрывает', async () => {
		await render(`
			<Tags closable>
				<TagsItem value="a" text="A" />
				<TagsItem value="b" text="B" disabled />
			</Tags>
		`)

		expect(closeOf('B').hasAttribute('disabled')).toBe(true)
		expect(closeOf('A').hasAttribute('disabled')).toBe(false)
	})

	it('размер кнопки — размер тега: от него считается кегль иконки', async () => {
		await render(`<Tags closable size="lg"><TagsItem value="a" text="A" /></Tags>`)

		expect(closeOf('A').classList.contains('s-button--size-lg')).toBe(true)
	})
})
