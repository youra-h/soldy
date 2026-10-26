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
 * Sets the properties of the layers as a difference with what it set itself;
 * foreign ones it leaves alone. Created once per component: a new one on the
 * same node would take foreign properties for its own. What stands on the node
 * from the start is the server's style on hydration.
 *
 * One effect: the consumer's style is parsed again only when its string
 * changed — two `$derived` for that were a reaction graph on every root.
 */
export function rootStyle(getStyle: () => TRootStyleLayers): Attachment<Element> {
	return (node) => {
		if (!hasInlineStyle(node)) return

		const { style } = node

		let applied = readDeclarations(style)
		let forward: string | undefined
		let parsed = EMPTY

		$effect(() => {
			const layers = getStyle()

			if (layers.forward !== forward) {
				forward = layers.forward
				parsed = parseStyle(forward, node.ownerDocument)
			}

			const next = toDeclarations(layers, parsed)

			applyDeclarations(style, applied, next)
			applied = next
		})
	}
}

/** Узел со своим инлайновым стилем — HTML, SVG и MathML. */
function hasInlineStyle(node: Element): node is Element & ElementCSSInlineStyle {
	return 'style' in node
}

/** The properties of an inline style; none — the shared empty map. */
function readDeclarations(style: CSSStyleDeclaration): TDeclarations {
	if (style.length === 0) return EMPTY

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

/**
 * The properties of the layers from the bottom up: of the same name the upper
 * one acts. No properties — the shared empty map: the root keeps the last
 * declarations, and most roots have none.
 */
function toDeclarations(layers: TRootStyleLayers, forward: TDeclarations): TDeclarations {
	const declarations = new Map<string, TDeclaration>()

	for (const [name, value] of Object.entries(layers.below)) {
		declarations.set(name, { value, priority: '' })
	}

	for (const [name, declaration] of forward) declarations.set(name, declaration)

	for (const [name, value] of Object.entries(layers.above)) {
		declarations.set(name, { value, priority: '' })
	}

	return declarations.size > 0 ? declarations : EMPTY
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
