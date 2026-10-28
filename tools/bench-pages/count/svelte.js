/**
 * Svelte's client runtime for the counting build (`vite.config.ts`, mode
 * `count`, alias of `svelte/internal/client`): the compiled templates' render
 * effects — `template_effect` (text, attributes, classes) and
 * `attribute_effect` (a spread set) — count their runs. Everything else is the
 * runtime itself: the internals import each other by relative path, the same
 * modules as here.
 */
import {
	attribute_effect as attributeEffect,
	template_effect as templateEffect,
} from '../../../node_modules/svelte/src/internal/client/index.js'
import { counted } from './counter.ts'

export * from '../../../node_modules/svelte/src/internal/client/index.js'

export function template_effect(fn, ...rest) {
	return templateEffect(counted(fn), ...rest)
}

export function attribute_effect(element, fn, ...rest) {
	return attributeEffect(element, counted(fn), ...rest)
}
