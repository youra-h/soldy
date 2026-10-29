/**
 * Every page of the Web Components host on the stand, in a real browser. In
 * WebKit the built-in elements live on a polyfill (`@ungap/custom-elements`,
 * `ui/webc/src/adapter/runtime/defineElement.ts`): Safari doesn't extend
 * built-in elements, and only this run puts the library through it. A page
 * opens without errors and warnings in the console, the window error guard
 * (`browser/setup.ts`) catches the rest, and every element of the library on
 * the page is upgraded — an instance of its class, built-in (`is`) and
 * autonomous alike. Layout and behaviour of the elements are checked by the
 * neighbouring `webc-*.spec.ts`; the jsdom smoke run doesn't meet the polyfill
 * at all.
 */

import { expect, it, onTestFinished, vi } from 'vitest'
import { useIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { availableOf } from '../src/catalog'
import { loadHost } from '../src/hosts'
import { router } from '../src/router'
import { renderStand } from './stand'

import '@soldy-ui/theme-oren'
import '../src/styles.css'

// The icon pack of the stand's entry point: previews draw icons by role
useIcons(material)

/** The pages of the host — the catalog of the library its previews cover. */
const PAGES = availableOf(await loadHost('webc')).map(({ id }) => id)

/** A frame: an element reports `ready` in the one after its assembly (`TElementPlugin`). */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** The library's name of a node, if it is an element of the library. */
function nameOf(node: Element): string | undefined {
	const name = node.getAttribute('is') ?? node.localName

	return name.startsWith('so-') ? name : undefined
}

/** Elements of the library on the page that are not instances of their class. */
function notUpgraded(): string[] {
	return [...document.querySelectorAll('*')].flatMap((node) => {
		const name = nameOf(node)

		if (name === undefined) return []

		const element = customElements.get(name)

		return element !== undefined && node instanceof element ? [] : [name]
	})
}

it.each(PAGES)('webc/%s: страница без ошибок и предупреждений, элементы ожили', async (id) => {
	const error = vi.spyOn(console, 'error')
	const warn = vi.spyOn(console, 'warn')

	onTestFinished(() => {
		error.mockRestore()
		warn.mockRestore()
	})

	renderStand()
	await router.push(`/webc/${id}`)

	// The page mounts the host's previews as it renders, and an element reports
	// `ready` a frame after its assembly. Under the polyfill the elements come to
	// life later, by its observer: the wait is for that state, not for a time
	await expect
		.poll(() => document.querySelector('.pg-col__stage .pg-mount > *'), {
			message: 'страница нарисована',
		})
		.not.toBeNull()
	await nextFrame()
	await nextFrame()
	await expect.poll(notUpgraded).toEqual([])

	expect(error).not.toHaveBeenCalled()
	expect(warn).not.toHaveBeenCalled()
})
