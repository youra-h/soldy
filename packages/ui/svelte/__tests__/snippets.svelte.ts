/**
 * Сниппеты слотов из кода теста.
 *
 * Разметкой сниппет объявляется только в `.svelte`, а из кода его даёт
 * `createRawSnippet`. Такой сниппет рисуется один раз: scope он получает
 * геттером, но разметку из строки собирает при отрисовке. Слоту, чей scope
 * меняется по ходу теста (`selected` после клика), нужен сниппет, который за
 * scope следит, — текст ставит эффект. Руны работают только в `.svelte` и
 * `.svelte.ts`, поэтому помощник — в своём файле, как `reactiveProps`.
 */

import { createRawSnippet, type Snippet } from 'svelte'

/**
 * Слот-текст: `<span>` с текстом от scope, текст пересчитывается на каждую
 * смену scope. Обёртка — потому что сниппет из кода рисует ровно один
 * элемент; текст строки она не меняет.
 */
export function scopeText<TScope>(text: (scope: TScope) => string): Snippet<[TScope]> {
	return createRawSnippet((scope: () => TScope) => ({
		render: () => '<span></span>',
		setup(node) {
			$effect(() => {
				node.textContent = text(scope())
			})
		},
	}))
}

/**
 * Слот-текст под счётом отрисовок: как `scopeText`, и каждая отрисовка —
 * первая и на каждую смену scope — отдаёт scope в `onDraw`. Заново Svelte
 * сниппет не зовёт: новый scope доходит до него геттером, и то, что прочло
 * scope, перерисовывается само. Поэтому отрисовка сниппета — его чтение
 * scope, и их счёт — то же, что счёт вызовов слота у Vue и React.
 */
export function countedText<TScope>(
	text: (scope: TScope) => string,
	onDraw: (scope: TScope) => void,
): Snippet<[TScope]> {
	return createRawSnippet((scope: () => TScope) => ({
		render: () => '<span></span>',
		setup(node) {
			$effect(() => {
				const current = scope()

				onDraw(current)
				node.textContent = text(current)
			})
		},
	}))
}

/** Слот-разметка без scope: один элемент из строки. */
export function markup(html: string): Snippet {
	return createRawSnippet(() => ({ render: () => html }))
}

/** Слот-разметка от scope, который не меняется: элемент коллекции и его значение. */
export function scopeMarkup<TScope>(html: (scope: TScope) => string): Snippet<[TScope]> {
	return createRawSnippet((scope: () => TScope) => ({ render: () => html(scope()) }))
}
