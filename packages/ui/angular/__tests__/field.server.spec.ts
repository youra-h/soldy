/**
 * Поле формы на сервере и после гидратации.
 *
 * Связку поля с контролом сервер рисует целиком: ошибку, `id` поля и ссылки на
 * части контрол берёт при своей сборке, а сборка — в `ngOnInit`, и на сервере
 * тоже. `id` частей и поля строит плагин связок от id монтирования поля — от
 * номера сборки в приложении: полная гидратация собирает компоненты в том же
 * порядке, что и сервер, и номера у них сходятся. Поэтому `id`, `for`
 * подписи и справка у сервера и браузера одни.
 *
 * Разметка сервера проверяется разобранной документом, как её получил бы
 * браузер.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal, type ApplicationRef } from '@angular/core'
import {
	TFieldComponent,
	TInputComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TRatingComponent,
	TSliderComponent,
} from '@soldy-ui/angular'
import { find } from './mount'
import { hydrate, leavePage, loadPage, renderOnServer } from './server'

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		TFieldComponent,
		TInputComponent,
		TRadioGroupComponent,
		TRadioGroupItemComponent,
		TRatingComponent,
		TSliderComponent,
	],
	template: `<div
			so-field
			class="email"
			label="Почта"
			helper="Подсказка"
			error="Нет @"
			[invalid]="invalid()"
		>
			<div so-input value="a"></div>
		</div>
		<div so-field class="choice" label="Выбор" helper="Подсказка">
			<div so-radio-group>
				<label so-radio-group-item value="a">А</label>
			</div>
		</div>
		<div so-field class="price" label="Цена" helper="Подсказка">
			<span so-slider [value]="[20, 80]" [thumbLabels]="['От', 'До']"></span>
		</div>
		<div so-field class="score" label="Оценка" helper="Подсказка">
			<span so-rating [value]="3"></span>
		</div>`,
})
class FieldPage {
	readonly invalid = signal(false)
}

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Страница сервера, разобранная документом, — как её получил бы браузер. */
async function serverPage(): Promise<Document> {
	return new DOMParser().parseFromString(await renderOnServer(FieldPage), 'text/html')
}

/** `id`, которые связка ставит в разметку: поля, подписи и подсказки. */
function idsOf(page: ParentNode): string[] {
	return [
		find(page, '.email input', HTMLInputElement).id,
		find(page, '.email .so-field__label', HTMLLabelElement).id,
		find(page, '.email .so-field__helper', HTMLElement).id,
	]
}

describe('серверный рендер', () => {
	it('сервер рисует связку: for подписи, id поля и справку', async () => {
		const page = await serverPage()
		const input = find(page, '.email input', HTMLInputElement)

		expect(input.id).not.toBe('')
		expect(find(page, '.email .so-field__label', HTMLLabelElement).htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(page, '.email .so-field__helper', HTMLElement).id,
		])
	})

	it('группа: ссылка на подпись и справку — у её корня', async () => {
		const page = await serverPage()
		const group = find(page, '.choice [so-radio-group]', HTMLElement)

		expect(refsOf(group, 'aria-labelledby')).toEqual([
			find(page, '.choice .so-field__label', HTMLLabelElement).id,
		])
		expect(refsOf(group, 'aria-describedby')).toEqual([
			find(page, '.choice .so-field__helper', HTMLElement).id,
		])
	})

	/**
	 * Ползунок с несколькими ручками — группа: набор корня (`rootAria`) база
	 * кладёт и на сервере, с ролью и ссылками на подпись и справку.
	 */
	it('ползунок с несколькими ручками: группа со ссылками на подпись и справку', async () => {
		const page = await serverPage()
		const group = find(page, '.price [so-slider]', HTMLElement)

		expect(group.getAttribute('role')).toBe('group')
		expect(refsOf(group, 'aria-labelledby')).toEqual([
			find(page, '.price .so-field__label', HTMLLabelElement).id,
		])
		expect(refsOf(group, 'aria-describedby')).toEqual([
			find(page, '.price .so-field__helper', HTMLElement).id,
		])
	})

	it('оценка — labelable: for подписи — на id её поля, справка — у поля', async () => {
		const page = await serverPage()
		const input = find(page, '.score input', HTMLInputElement)

		expect(input.id).not.toBe('')
		expect(find(page, '.score .so-field__label', HTMLLabelElement).htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(page, '.score .so-field__helper', HTMLElement).id,
		])
	})
})

/** Разметка сервера в документе и гидратация над ней: приложение браузера и его страница. */
async function hydrated(): Promise<{ app: ApplicationRef; page: FieldPage; server: string[] }> {
	const html = await renderOnServer(FieldPage)

	loadPage(html)

	const server = idsOf(document)
	const app = await hydrate(FieldPage)

	await app.whenStable()

	const page: unknown = app.components[0]?.instance

	if (!(page instanceof FieldPage)) throw new Error('Корень приложения — не FieldPage')

	return { app, page, server }
}

describe('гидратация', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		leavePage()
	})

	it('id поля, for подписи и справка у сервера и браузера одни, без ошибок', async () => {
		const error = vi.spyOn(console, 'error')
		const warn = vi.spyOn(console, 'warn')
		const { server } = await hydrated()
		const input = find(document, '.email input', HTMLInputElement)

		expect(idsOf(document)).toEqual(server)
		expect(find(document, '.email .so-field__label', HTMLLabelElement).htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([server[2]])
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})

	it('группа: подпись называет её ссылкой, for у подписи снят', async () => {
		await hydrated()

		const label = find(document, '.choice .so-field__label', HTMLLabelElement)

		expect(
			refsOf(find(document, '.choice [so-radio-group]', HTMLElement), 'aria-labelledby'),
		).toEqual([label.id])
		expect(label.hasAttribute('for')).toBe(false)
	})

	it('ошибка после гидратации доходит до контрола', async () => {
		const { app, page } = await hydrated()

		page.invalid.set(true)
		await app.whenStable()

		const input = find(document, '.email input', HTMLInputElement)

		expect(input.getAttribute('aria-invalid')).toBe('true')
		expect(find(document, '.email [so-input]', HTMLElement).dataset['invalid']).toBe('true')
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.email .so-field__error', HTMLElement).id,
		])
	})
})
