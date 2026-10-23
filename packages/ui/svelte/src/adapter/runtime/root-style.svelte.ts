/**
 * Стиль корня на узле — по свойствам, как у Vue и React: атрибут `style`
 * Svelte пишет целиком и стирал бы то, что плагины ставят на узел сами.
 * В браузере его ставит attachment, на сервере — строка атрибута (`BROWSER`
 * из `esm-env`). AGENTS.md (Svelte), «Стиль корня».
 */

import { BROWSER } from 'esm-env'
import type { Attachment } from 'svelte/attachments'
import {
	toStyleAttribute,
	type TRootAttributes,
	type TRootNodeAttributes,
	type TRootStyleLayers,
} from '../common/root'

/** Attachment стиля корня под своим ключом (`createAttachmentKey`). */
export type TRootStyleAttachment = { readonly [key: symbol]: Attachment<Element> }

/** Свойство инлайнового стиля: значение и приоритет — `important` или пусто. */
type TDeclaration = {
	readonly value: string
	readonly priority: string
}

/** Свойства инлайнового стиля по имени. */
type TDeclarations = ReadonlyMap<string, TDeclaration>

const EMPTY: TDeclarations = new Map()

/**
 * Атрибуты узла корня. В браузере `style` нет: его ставит attachment, первым
 * среди attachment-ов спреда — раньше потребительских.
 */
export function toNodeAttributes(
	attributes: TRootAttributes,
	style: TRootStyleAttachment,
): TRootNodeAttributes {
	const { style: layers, ...node } = attributes

	return BROWSER ? { ...style, ...node } : { ...node, style: toStyleAttribute(layers) }
}

/**
 * Ставит свойства слоёв разницей с тем, что поставил сам; чужие не трогает.
 * Заводится один раз на компонент: новый на том же узле принял бы чужие
 * свойства за свои. Стоящее на узле с начала — стиль сервера при гидратации.
 */
export function rootStyle(getStyle: () => TRootStyleLayers): Attachment<Element> {
	return (node) => {
		if (!hasInlineStyle(node)) return

		const { style } = node
		const forward = $derived(getStyle().forward)
		const parsed = $derived(parseStyle(forward, node.ownerDocument))

		let applied = readDeclarations(style)

		$effect(() => {
			const next = toDeclarations(getStyle(), parsed)

			applyDeclarations(style, applied, next)
			applied = next
		})
	}
}

/** Узел со своим инлайновым стилем — HTML, SVG и MathML. */
function hasInlineStyle(node: Element): node is Element & ElementCSSInlineStyle {
	return 'style' in node
}

/** Свойства, которые стоят в инлайновом стиле. */
function readDeclarations(style: CSSStyleDeclaration): TDeclarations {
	const declarations = new Map<string, TDeclaration>()

	for (let index = 0; index < style.length; index++) {
		const name = style.item(index)

		declarations.set(name, {
			value: style.getPropertyValue(name),
			priority: style.getPropertyPriority(name),
		})
	}

	return declarations
}

/** Стиль потребителя свойствами — разбирает браузер, отсоединённым узлом. */
function parseStyle(text: string | undefined, document: Document): TDeclarations {
	if (!text) return EMPTY

	const probe = document.createElement('div')

	probe.style.cssText = text

	return readDeclarations(probe.style)
}

/** Свойства слоёв снизу вверх: из одноимённых действует верхнее. */
function toDeclarations(layers: TRootStyleLayers, forward: TDeclarations): TDeclarations {
	const declarations = new Map<string, TDeclaration>()

	for (const [name, value] of Object.entries(layers.below)) {
		declarations.set(name, { value, priority: '' })
	}

	for (const [name, declaration] of forward) declarations.set(name, declaration)

	for (const [name, value] of Object.entries(layers.above)) {
		declarations.set(name, { value, priority: '' })
	}

	return declarations
}

/** Пропавшие свойства — снять, новые и сменившиеся — поставить; остальное не трогать. */
function applyDeclarations(
	style: CSSStyleDeclaration,
	previous: TDeclarations,
	next: TDeclarations,
): void {
	for (const name of previous.keys()) {
		if (!next.has(name)) style.removeProperty(name)
	}

	for (const [name, declaration] of next) {
		if (!isSame(previous.get(name), declaration)) {
			style.setProperty(name, declaration.value, declaration.priority)
		}
	}
}

/** То же значение с тем же приоритетом. */
function isSame(previous: TDeclaration | undefined, next: TDeclaration): boolean {
	return previous?.value === next.value && previous.priority === next.priority
}
