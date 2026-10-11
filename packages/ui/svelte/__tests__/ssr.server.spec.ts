/**
 * Серверный рендер компонентов Svelte: компоненты собраны для сервера, рисует
 * их `render` из `svelte/server` — как сервер приложения.
 *
 * Состояние на сервере приходит той же подпиской на связку, что и в браузере,
 * а эффекты не выполняются вовсе. Поэтому разметка сервера — это ровно то, что
 * компонент рисует с первой отрисовки: наборы ядра, классы и раскладка, — а
 * телепорта Frame нет, как у React: содержимое в цели появляется после
 * гидратации.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение.
 */

import { describe, it, expect } from 'vitest'
import { createRawSnippet } from 'svelte'
import { createAttachmentKey } from 'svelte/attachments'
import { render } from 'svelte/server'
import { Button, Frame, Icon, ProgressSpinner, Skeleton, roleIcon } from '@soldy-ui/svelte'

/** Содержимое панели. */
const content = createRawSnippet(() => ({ render: () => '<span>Панель</span>' }))

/**
 * Разметка сервера без комментариев: в них Svelte пишет метки гидратации
 * блоков и id монтирования (`<!--$s1-->`), а проверяется сама разметка.
 */
const markup = (body: string) => body.replace(/<!--[\s\S]*?-->/g, '')

describe('Frame · серверный рендер', () => {
	it('без contained — пусто: телепорта на сервере нет', () => {
		const body = markup(render(Frame, { props: { visible: true, children: content } }).body)

		expect(body).toBe('')
	})

	it('contained — на месте, вместе с содержимым и раскладкой', () => {
		const body = markup(
			render(Frame, { props: { contained: true, visible: true, children: content } }).body,
		)

		expect(body).toMatch(/^<div [^>]*class="s-frame"/)
		expect(body).toContain('data-contained="true"')
		// Внутри контейнера — `absolute` без координат: место решает тема
		expect(body).toMatch(/style="position: absolute; [^"]*z-index: \d+"/)
		expect(body).not.toMatch(/style="[^"]*\b(left|top):/)
		expect(body).toContain('<span>Панель</span>')
	})
})

describe('Button · серверный рендер', () => {
	it('классы ядра и потребителя, наборы и текст', () => {
		const body = markup(
			render(Button, {
				props: { text: 'Сохранить', size: 'lg', variant: 'brand', class: 'app-save' },
			}).body,
		)

		expect(body).toMatch(/^<button /)
		expect(body).toContain(
			'class="s-button s-button--size-lg s-button--variant-brand app-save"',
		)
		expect(body).toContain('data-disabled="false"')
		expect(body).toContain('<span class="s-button__text">Сохранить</span>')
	})

	it('выключенная: нативный disabled на <button>, aria-disabled — на другом теге', () => {
		const native = markup(render(Button, { props: { disabled: true } }).body)
		const link = markup(render(Button, { props: { tag: 'a', disabled: true } }).body)

		expect(native).toMatch(/^<button [^>]*\bdisabled\b/)
		expect(native).toContain('data-disabled="true"')
		expect(link).toMatch(/^<a [^>]*aria-disabled="true"/)
		expect(link).not.toMatch(/^<a [^>]* disabled/)
	})

	it('скрытая — display: none в стиле корня', () => {
		const body = markup(render(Button, { props: { visible: false } }).body)

		expect(body).toMatch(/^<button [^>]*style="display: none"/)
	})

	/**
	 * В браузере стиль корня ставит attachment по свойствам, а на сервере
	 * attachment-ов нет: стиль уходит строкой атрибута, слои — в том же порядке.
	 */
	it('стиль потребителя — строкой, поверх него display: none скрытой', () => {
		const body = markup(render(Button, { props: { visible: false, style: 'color: red' } }).body)

		expect(body).toMatch(/^<button [^>]*style="color: red; display: none"/)
	})

	/** Attachment едет в атрибутах корня и на сервере, но узла там нет: он ждёт браузера. */
	it('attachment потребителя не выполняется и разметку не меняет', () => {
		const nodes: Element[] = []
		const attach = (node: Element) => {
			nodes.push(node)
		}
		const plain = markup(render(Button, { props: { text: 'Сохранить' } }).body)
		const attached = markup(
			render(Button, { props: { text: 'Сохранить', [createAttachmentKey()]: attach } }).body,
		)

		expect(attached).toBe(plain)
		expect(nodes).toHaveLength(0)
	})
})

describe('стиль и наборы на сервере', () => {
	it('Icon по роли — <svg> иконки с размером и скрытием от скринридера', () => {
		const body = markup(render(Icon, { props: { tag: roleIcon('check'), width: 20 } }).body)

		expect(body).toMatch(/^<svg [^>]*class="s-icon s-icon--size-normal"/)
		expect(body).toContain('aria-hidden="true"')
		expect(body).toContain('style="width: 20px"')
		expect(body).toContain('<path')
	})

	it('ProgressSpinner — доля в стиле корня, роль и значения', () => {
		const body = markup(render(ProgressSpinner, { props: { value: 40 } }).body)

		expect(body).toMatch(/^<span [^>]*role="progressbar"/)
		expect(body).toContain('aria-valuenow="40"')
		expect(body).toContain('style="--s-progress-spinner-fraction: 0.4"')
	})

	it('ProgressSpinner — стиль потребителя поверх доли', () => {
		const body = markup(
			render(ProgressSpinner, { props: { value: 40, style: 'color: red' } }).body,
		)

		expect(body).toContain('style="--s-progress-spinner-fraction: 0.4; color: red"')
	})

	it('Skeleton — заглушка и содержимое, корень не скрыт', () => {
		const body = markup(render(Skeleton, { props: { children: content } }).body)

		expect(body).toContain('<div class="s-skeleton__placeholder" aria-hidden="true"></div>')
		expect(body).toContain('aria-busy="true"')
		expect(body).toContain('<span>Панель</span>')
		expect(body).not.toContain('display: none')
	})
})
