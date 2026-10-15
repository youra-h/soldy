/**
 * Серверный рендер компонентов Solid: JSX собран для сервера, рисует его
 * `renderToString` из `solid-js/web` — как сервер приложения.
 *
 * Состояние на сервере приходит той же подпиской на связку, что и в браузере,
 * а эффекты не выполняются вовсе. Поэтому разметка сервера — это ровно то, что
 * компонент рисует с первой отрисовки: наборы ядра, классы и раскладка, — а
 * телепорта Frame нет, как у React и Svelte: содержимое в цели появляется на
 * клиенте.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение.
 */

import { describe, it, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { renderToString } from 'solid-js/web'
import {
	Button,
	CheckBox,
	ComponentView,
	Frame,
	Icon,
	Input,
	Label,
	ProgressSpinner,
	Skeleton,
	Switch,
	roleIcon,
} from '@soldy-ui/solid'

/**
 * Разметка сервера без меток гидратации: ключи узлов (`data-hk`) и
 * комментарии вокруг вставок пишет Solid для гидратации, а проверяется сама
 * разметка. Классы Solid печатает с пробелом в конце (`class="s-button "`) —
 * место под `classList`.
 */
const markup = (html: string) =>
	html.replace(/<!--[\s\S]*?-->/g, '').replace(/ data-hk="[^"]*"/g, '')

describe('Frame · серверный рендер', () => {
	it('без contained — пусто: телепорта на сервере нет', () => {
		expect(markup(renderToString(() => <Frame visible>Панель</Frame>))).toBe('')
	})

	it('contained — на месте, вместе с содержимым и раскладкой', () => {
		const body = markup(
			renderToString(() => (
				<Frame contained visible>
					<span>Панель</span>
				</Frame>
			)),
		)

		expect(body).toMatch(/^<div [^>]*class="s-frame ?"/)
		expect(body).toContain('data-contained="true"')
		// Внутри контейнера — `absolute` без координат: место решает тема
		expect(body).toMatch(/style="position:absolute;[^"]*z-index:\d+"/)
		expect(body).not.toMatch(/style="[^"]*\b(left|top):/)
		expect(body).toContain('<span>Панель</span>')
	})
})

describe('Button · серверный рендер', () => {
	it('классы ядра и потребителя, наборы и текст', () => {
		const body = markup(
			renderToString(() => (
				<Button text="Сохранить" size="lg" variant="brand" class="app-save" />
			)),
		)

		expect(body).toMatch(/^<button /)
		expect(body).toMatch(
			/class="s-button s-button--size-lg s-button--variant-brand app-save ?"/,
		)
		expect(body).toContain('data-disabled="false"')
		expect(body).toContain('<span class="s-button__text">Сохранить</span>')
	})

	it('выключенная: нативный disabled на <button>, aria-disabled — на другом теге', () => {
		const native = markup(renderToString(() => <Button disabled />))
		const link = markup(renderToString(() => <Button tag="a" disabled />))

		expect(native).toMatch(/^<button [^>]*\bdisabled\b/)
		expect(native).toContain('data-disabled="true"')
		expect(link).toMatch(/^<a [^>]*aria-disabled="true"/)
		expect(link).not.toMatch(/^<a [^>]* disabled/)
	})

	it('скрытая — display: none в стиле корня', () => {
		const body = markup(renderToString(() => <Button visible={false} />))

		expect(body).toMatch(/^<button [^>]*style="display:none"/)
	})
})

describe('стиль и наборы на сервере', () => {
	it('Icon по роли — <svg> иконки с размером и скрытием от скринридера', () => {
		const body = markup(renderToString(() => <Icon tag={roleIcon('check')} width={20} />))

		expect(body).toMatch(/^<svg [^>]*class="s-icon s-icon--size-normal ?"/)
		expect(body).toContain('aria-hidden="true"')
		// Пустое значение (`height: ''` без размера) свойства не задаёт
		expect(body).toContain('style="width:20px"')
		expect(body).toContain('<path')
	})

	it('ProgressSpinner — доля в стиле корня, роль и значения', () => {
		const body = markup(renderToString(() => <ProgressSpinner value={40} />))

		expect(body).toMatch(/^<span [^>]*role="progressbar"/)
		expect(body).toContain('aria-valuenow="40"')
		expect(body).toContain('style="--s-progress-spinner-fraction:0.4"')
	})

	it('Skeleton — заглушка и содержимое, корень не скрыт', () => {
		const body = markup(
			renderToString(() => (
				<Skeleton>
					<span>Панель</span>
				</Skeleton>
			)),
		)

		expect(body).toContain('<div class="s-skeleton__placeholder" aria-hidden="true"></div>')
		expect(body).toContain('aria-busy="true"')
		expect(body).toContain('<span>Панель</span>')
		expect(body).not.toContain('display:none')
	})
})

describe('Label · серверный рендер', () => {
	/**
	 * Подпись — корень `label`, контрол внутри, потом текст: связка с полем —
	 * вложение, и она есть с первой отрисовки, без `for` и `id`.
	 */
	it('корень label, контрол, потом текст', () => {
		const body = markup(
			renderToString(() => (
				<Label text="Согласен">
					<CheckBox value />
				</Label>
			)),
		)

		expect(body).toMatch(
			/^<label [^>]*class="s-label s-label--size-normal s-label--position-end ?"/,
		)
		expect(body).toMatch(
			/<span class="s-label__control"><span [^>]*class="s-check-box[^"]*"[^>]*><input [^>]*type="checkbox"[^>]*checked/,
		)
		expect(body).toContain('<span class="s-label__text">Согласен</span>')
		expect(body).not.toMatch(/\sfor=/)
	})

	it('без текста обёртка текста пуста', () => {
		const body = markup(renderToString(() => <Label />))

		expect(body).toContain('<span class="s-label__text"></span>')
	})
})

/**
 * `ref` потребителя — корень компонента, и отдаёт его `ref` адаптера, когда
 * узел создан. На сервере узлов нет, и `ref` Solid не зовёт: ни вызова, ни
 * атрибута в разметке.
 */
describe('ref потребителя · серверный рендер', () => {
	/** Компонент и пропсы, без которых его корня нет: у Icon тега по умолчанию нет. */
	const ROOTS: ReadonlyArray<readonly [string, (ref?: (node: Element) => void) => JSX.Element]> =
		[
			['Button', (ref) => <Button ref={ref} />],
			['ComponentView', (ref) => <ComponentView ref={ref} />],
			['Frame', (ref) => <Frame contained visible ref={ref} />],
			['Icon', (ref) => <Icon tag="i" ref={ref} />],
			['Label', (ref) => <Label ref={ref} />],
			['ProgressSpinner', (ref) => <ProgressSpinner ref={ref} />],
			['Skeleton', (ref) => <Skeleton ref={ref} />],
			['Input', (ref) => <Input ref={ref} />],
			['CheckBox', (ref) => <CheckBox ref={ref} />],
			['Switch', (ref) => <Switch ref={ref} />],
		]

	/**
	 * Разметка без номера слоя: слой (`data-layer`, `z-index`) панель берёт из
	 * общего счётчика показанных панелей, и у второй отрисовки он следующий.
	 */
	const layout = (html: string) =>
		markup(html)
			.replace(/data-layer="\d+"/g, 'data-layer')
			.replace(/z-index:\d+/g, 'z-index')

	it.each(ROOTS)('%s: ref не зовётся, разметка — та же', (_name, draw) => {
		const nodes: Element[] = []
		const body = layout(renderToString(() => draw((node) => nodes.push(node))))

		expect(nodes).toHaveLength(0)
		expect(body).toBe(layout(renderToString(() => draw())))
	})
})
