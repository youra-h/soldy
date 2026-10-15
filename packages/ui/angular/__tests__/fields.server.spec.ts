/**
 * Поля и подпись на сервере и после гидратации.
 *
 * Разметка сервера несёт то, что поле пишет само: текст — атрибутом `value`
 * (директива текста поля пишет его в узел эмуляции DOM, а она отдаёт его
 * атрибутом), отметку — атрибутом `checked`, наборы `aria` и `clearAria` — на
 * `<input>` и кнопке очистки, а атрибуты потребителя — уже на `<input>`: их
 * туда перенесла база.
 *
 * При гидратации Angular ставит статические атрибуты разметки потребителя на
 * узел сервера заново, и база переносит их так же — на `<input>` из разметки
 * сервера. Наборы, которые сервер напечатал на корне, она с поля не тянет:
 * чей атрибут, она узнаёт по разметке потребителя, а не по узлу.
 *
 * Разметка сервера проверяется разобранной документом, как её получил бы
 * браузер.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal, type ApplicationRef } from '@angular/core'
import {
	TCheckBoxComponent,
	TInputComponent,
	TLabelComponent,
	TSwitchComponent,
} from '@soldy-ui/angular'
import { find } from './mount'
import { hydrate, leavePage, loadPage, renderOnServer } from './server'

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TLabelComponent, TCheckBoxComponent, TSwitchComponent, TInputComponent],
	template: `<label so-label text="Согласен" class="agree"
			><so-check-box [value]="checked()" title="Согласие"
		/></label>
		<so-switch value direction="rtl" />
		<so-input
			[value]="text()"
			autocomplete="email"
			class="email"
			clearable
			name="Город"
			direction="rtl"
		/>`,
})
class FieldsPage {
	readonly checked = signal(true)
	readonly text = signal('abc')
}

/** Страница сервера, разобранная документом, — как её получил бы браузер. */
async function serverPage(): Promise<Document> {
	return new DOMParser().parseFromString(await renderOnServer(FieldsPage), 'text/html')
}

describe('серверный рендер', () => {
	it('Label — подпись вокруг флажка, текст и классы на теге потребителя', async () => {
		const page = await serverPage()
		const label = find(page, '.agree', HTMLLabelElement)

		expect([...label.classList]).toEqual(
			expect.arrayContaining(['agree', 'so-label', 'so-label--position-end']),
		)
		expect(label.querySelector('.so-label__text')?.textContent).toBe('Согласен')
		expect(label.querySelector('.so-label__control so-check-box input')).not.toBeNull()
	})

	it('CheckBox и Switch — отметка атрибутом checked, атрибут потребителя на поле', async () => {
		const page = await serverPage()
		const box = find(page, 'so-check-box', HTMLElement)
		const toggle = find(page, 'so-switch', HTMLElement)

		expect(find(box, 'input', HTMLInputElement).hasAttribute('checked')).toBe(true)
		expect(find(box, 'input', HTMLInputElement).getAttribute('title')).toBe('Согласие')
		expect(box.hasAttribute('title')).toBe(false)
		expect(find(toggle, 'input', HTMLInputElement).hasAttribute('checked')).toBe(true)
		expect(find(toggle, 'input', HTMLInputElement).getAttribute('role')).toBe('switch')
		expect(toggle.getAttribute('dir')).toBe('rtl')
		// Атрибут-вход — запись входа, а не атрибут корня
		expect(toggle.hasAttribute('value')).toBe(false)
	})

	it('Input — текст атрибутом value, атрибуты потребителя на поле, имя кнопки очистки', async () => {
		const page = await serverPage()
		const root = find(page, 'so-input', HTMLElement)
		const input = find(root, 'input', HTMLInputElement)

		expect(input.getAttribute('value')).toBe('abc')
		expect(input.getAttribute('autocomplete')).toBe('email')
		expect(input.getAttribute('name')).toBe('Город')
		expect(root.hasAttribute('autocomplete')).toBe(false)
		expect(root.hasAttribute('name')).toBe(false)
		expect([...root.classList]).toEqual(expect.arrayContaining(['email', 'so-input']))
		expect(root.getAttribute('dir')).toBe('rtl')
		expect(find(root, '.so-input__clear', HTMLButtonElement).getAttribute('aria-label')).toBe(
			'Clear Город',
		)
	})
})

/** Разметка сервера в документе и гидратация над ней: приложение браузера и его страница. */
async function hydrated(): Promise<{ app: ApplicationRef; page: FieldsPage }> {
	loadPage(await renderOnServer(FieldsPage))

	const app = await hydrate(FieldsPage)

	await app.whenStable()

	const page: unknown = app.components[0]?.instance

	if (!(page instanceof FieldsPage)) throw new Error('Корень приложения — не FieldsPage')

	return { app, page }
}

describe('гидратация', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		leavePage()
	})

	it('узлы сервера переиспользуются, ошибок и предупреждений нет', async () => {
		const error = vi.spyOn(console, 'error')
		const warn = vi.spyOn(console, 'warn')

		loadPage(await renderOnServer(FieldsPage))

		const input = find(document, 'so-input input', HTMLInputElement)
		const box = find(document, 'so-check-box input', HTMLInputElement)
		const clear = find(document, '.so-input__clear', HTMLButtonElement)
		const app = await hydrate(FieldsPage)

		await app.whenStable()

		expect(find(document, 'so-input input', HTMLInputElement)).toBe(input)
		expect(find(document, 'so-check-box input', HTMLInputElement)).toBe(box)
		expect(find(document, '.so-input__clear', HTMLButtonElement)).toBe(clear)
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})

	/**
	 * Статические атрибуты Angular ставит на узел сервера заново, а база
	 * переносит их на поле: на корне их нет и после гидратации. Своё, что
	 * сервер напечатал на корне, — `dir` ядра — остаётся на корне.
	 */
	it('атрибуты потребителя — на поле, а не на корне; dir ядра — на корне', async () => {
		await hydrated()

		const root = find(document, 'so-input', HTMLElement)
		const input = find(root, 'input', HTMLInputElement)
		const box = find(document, 'so-check-box', HTMLElement)

		expect(root.hasAttribute('autocomplete')).toBe(false)
		expect(input.getAttribute('autocomplete')).toBe('email')
		expect(root.getAttribute('dir')).toBe('rtl')
		expect(input.hasAttribute('dir')).toBe(false)
		expect(box.hasAttribute('title')).toBe(false)
		expect(find(box, 'input', HTMLInputElement).getAttribute('title')).toBe('Согласие')
	})

	it('текст и отметка после гидратации идут за значением', async () => {
		const { app, page } = await hydrated()
		const input = find(document, 'so-input input', HTMLInputElement)
		const box = find(document, 'so-check-box input', HTMLInputElement)

		expect(input.value).toBe('abc')
		expect(box.checked).toBe(true)

		page.text.set('xyz')
		page.checked.set(false)
		await app.whenStable()

		expect(input.value).toBe('xyz')
		expect(box.checked).toBe(false)
	})
})
