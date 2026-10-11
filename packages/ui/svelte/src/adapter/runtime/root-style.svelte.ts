/**
 * Стиль корня на узле — по свойствам, как у Vue и React.
 *
 * Атрибут `style` Svelte пишет целиком (`style.cssText`), и каждая смена стиля
 * корня стирала бы то, что плагины ставят на узел сами, мимо разметки: сдвиг
 * панели во время жеста и `user-select` (`TSwipePlugin`), предел высоты списка
 * (`TListHeightPlugin`), переменные перетаскивания и ширины колонок таблицы.
 * Поэтому в браузере стиль корня ставит attachment (`rootStyle`): сменившиеся
 * свойства ставит, пропавшие снимает, чужих не трогает. Attachment на сервере
 * не выполняется — туда стиль уходит строкой атрибута (`toNodeAttributes`).
 *
 * Сервер от браузера отличает `BROWSER` из `esm-env`: его вместо
 * `$app/environment` советует библиотекам SvelteKit, и тем же флагом делят
 * работу модули самого Svelte (`svelte/reactivity/window`). Флаг ставит
 * сборщик условием экспорта `browser`, без условий — проверкой `window`.
 */

import { BROWSER } from 'esm-env'
import type { Attachment } from 'svelte/attachments'
import {
	toStyleAttribute,
	type TRootAttributes,
	type TRootNodeAttributes,
	type TRootStyleLayers,
} from '../common/root'

/**
 * Attachment стиля корня под своим ключом (`createAttachmentKey`): объект,
 * который спред атрибутов кладёт на узел, как attachment потребителя.
 */
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
 * Атрибуты узла корня.
 *
 * В браузере ключа `style` в них нет вовсе: с ним Svelte писал бы атрибут
 * целиком сам, а при гидратации снял бы стиль, который поставил сервер. Стиль
 * ставит attachment `style` — он едет в атрибутах первым, раньше attachment-ов
 * потребителя: на элементе Svelte выполняет attachment-ы спреда по порядку
 * ключей, и то, что потребитель поставит на узел, стиль своим не считает.
 *
 * На сервере attachment-ов нет, и стиль — строкой атрибута.
 */
export function toNodeAttributes(
	attributes: TRootAttributes,
	style: TRootStyleAttachment,
): TRootNodeAttributes {
	const { style: layers, ...node } = attributes

	return BROWSER ? { ...style, ...node } : { ...node, style: toStyleAttribute(layers) }
}

/**
 * Attachment стиля корня: ставит свойства слоёв `getStyle` разницей с тем, что
 * поставил сам.
 *
 * Свойства слоёв ядра и плагинов — как есть, стиль потребителя разбирает
 * браузер; из одноимённых действует верхний слой, со своим приоритетом. Сверка
 * — с тем, что поставлено в прошлый раз, а не с узлом: свойство, которое
 * плагин переписал поверх, остаётся его, пока своё значение не сменится.
 *
 * Поставленным с самого начала считается стиль, который уже стоит на узле.
 * В браузере спред атрибутов стиля не пишет, и узел приходит без него — кроме
 * гидратации: там это стиль сервера, и свойство, которого у браузера нет,
 * снимается, как сняла бы его гидратация самого Svelte.
 *
 * Сам attachment выполняется на узел один раз, а свойства ставит вложенный
 * эффект: смена стиля attachment не перезапускает, и поставленное помнится,
 * пока жив узел. Поэтому и заводится attachment один раз на компонент
 * (`Dynamic`): новый на том же узле принял бы за свои свойства, которые
 * плагины поставили сами. Новый узел — при смене тега — он принимает заново.
 */
export function rootStyle(getStyle: () => TRootStyleLayers): Attachment<Element> {
	return (node) => {
		if (!hasInlineStyle(node)) return

		const { style } = node
		// Строку потребителя браузер разбирает заново, только когда она сменилась
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

/**
 * Стиль потребителя — свойствами. Строку разбирает браузер — стилем
 * отсоединённого узла, как разобрал бы атрибут `style`: сокращённые свойства,
 * `!important` и комментарии — его забота, своего разбора нет.
 */
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
