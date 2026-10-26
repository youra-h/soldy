/**
 * The entry of a composite element: `import '@soldy-ui/webc/select'` defines
 * the select with its parts and every element its markup draws — the field,
 * the panel, the tags of `multiple`, the rows of the options. A template takes
 * a detail by its class, so the module graph of the entry brings the detail's
 * module, which defines it; an element the entry did not bring would be an
 * error of the template, not a plain node. The file imports nothing else of
 * the package, and a test file runs in a document, and a registry, of its own.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TSelectElement, type TSelectElementProps } from '@soldy-ui/webc/select'

/** Rendering is coalesced into a microtask, and a change of the select renders its details. */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 4; turn++) {
		await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
	}
}

/** `TElementPlugin` announces the node a frame later — the listeners of the plugins come then. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Errors the document reported: a detail without its element throws in the owner's callback. */
const reported: unknown[] = []
const report = (event: ErrorEvent) => reported.push(event.error)

window.addEventListener('error', report)

afterEach(() => {
	document.body.innerHTML = ''
	reported.length = 0
})

function isSelect(node: Element | null): node is TSelectElementProps {
	return node instanceof TSelectElement
}

/** A node by its selector; none, or not of the type — the test fails here. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: no such node`)

	return node
}

/** A select in the page as markup, the options in its light DOM. */
async function render(): Promise<TSelectElementProps> {
	const host = document.body.appendChild(document.createElement('div'))

	host.innerHTML = `<div is="so-select" mode="multiple" aria_label="City">
		<div is="so-select-item" value="msk" text="Moscow"></div>
		<div is="so-select-item" value="tver" text="Tver"></div>
	</div>`
	await settle()
	await nextFrame()

	const el = host.querySelector('[is="so-select"]')

	if (!isSelect(el)) throw new Error('<div is="so-select"> is not a select of soldy')

	return el
}

async function click(target: HTMLElement): Promise<void> {
	target.click()
	await settle()
}

/** The row of an option by its text. */
function optionOf(text: string): HTMLElement {
	const found = [...document.querySelectorAll('[role="option"]')].find(
		(row): row is HTMLElement => row instanceof HTMLElement && row.textContent?.trim() === text,
	)

	if (!found) throw new Error(`no option «${text}»`)

	return found
}

/** The texts of the tags shown in the field. */
const tagTexts = (el: Element) =>
	[...el.querySelectorAll('.so-select__tags .so-tags-item')]
		.filter((node) => node instanceof HTMLElement && node.style.display !== 'none')
		.map((node) => node.firstElementChild?.textContent?.trim())

describe('вход @soldy-ui/webc/select', () => {
	it('определяет Select с частями и детали его разметки, чужих элементов нет', () => {
		expect(customElements.get('so-select')).toBe(TSelectElement)

		for (const name of [
			'so-select-item',
			'so-select-group',
			'so-input',
			'so-frame',
			'so-tags',
		]) {
			expect(customElements.get(name), name).toBeDefined()
		}

		for (const name of ['so-table', 'so-calendar', 'so-menu', 'so-tabs', 'so-dialog']) {
			expect(customElements.get(name), name).toBeUndefined()
		}
	})

	it('multiple с опциями разметкой: панель открывается, выбранное — тегами в поле', async () => {
		const el = await render()
		const field = find(el, '.so-select__field input', HTMLInputElement)
		const panel = find(document, '.so-select__panel', HTMLElement)

		expect(panel.style.display).toBe('none')

		await click(field)

		expect(panel.style.display).not.toBe('none')

		await click(optionOf('Moscow'))
		await click(optionOf('Tver'))

		expect(tagTexts(el)).toEqual(['Moscow', 'Tver'])
		expect(el.value).toEqual(['msk', 'tver'])
		expect(reported).toEqual([])
	})
})
