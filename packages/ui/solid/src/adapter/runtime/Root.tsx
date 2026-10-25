/**
 * Корень компонента по `tag` — то, что делал `Dynamic`, без его прокси и
 * лишних вычислений: тег — одно мемо, атрибуты — один эффект `assign`, `ref`
 * зовётся под мемо, а не своим эффектом. На сервере и для компонента в `tag`
 * — `createDynamic`, без вызова компонента над ним: ключи гидратации у
 * сервера и браузера те же, что были у `Dynamic`. AGENTS.md (Solid), «Корень и
 * узлы частей».
 */

import {
	createMemo,
	createRenderEffect,
	mergeProps,
	untrack,
	type Accessor,
	type JSX,
} from 'solid-js'
import {
	SVGElements,
	assign,
	createDynamic,
	getNextElement,
	insert,
	isServer,
	use,
} from 'solid-js/web'
import type { TRootProps } from '../common/root'
import { rootTag, type TTagComponent } from './tag'

export type TRootComponentProps = {
	/** `tag` ядра: строка или компонент Solid, иначе корня нет. */
	tag: unknown
	/** Атрибуты корня — мемо раскладки (`createRootProps`). */
	attributes: Accessor<TRootProps>
	/** `ref` адаптера: привязка к `TElementPlugin` и `ref` потребителя. */
	ref: (element: Element) => void
	children?: JSX.Element
}

const SVG = 'http://www.w3.org/2000/svg'

/** Корень через `createDynamic`: атрибуты, `ref` и содержимое — одними пропсами. */
function dynamicRoot(
	tag: () => string | TTagComponent | undefined,
	props: TRootComponentProps,
): JSX.Element {
	return createDynamic(
		tag,
		mergeProps(props.attributes, {
			ref: props.ref,
			get children(): JSX.Element {
				return props.children
			},
		}),
	)
}

/** Узел тега: в окне гидратации — узел сервера, иначе — новый. */
function nodeOf(tag: string, is: unknown): Element {
	return getNextElement(() =>
		SVGElements.has(tag)
			? document.createElementNS(SVG, tag)
			: document.createElement(tag, typeof is === 'string' ? { is } : undefined),
	)
}

export function Root(props: TRootComponentProps): JSX.Element
export function Root(props: TRootComponentProps): JSX.Element | Accessor<JSX.Element> {
	if (isServer) return dynamicRoot(() => rootTag(props.tag), props)

	// Мемо идёт только за тегом: смена тега — новый узел, очистки `ref` — прежнему
	const root = createMemo(() => {
		const tag = rootTag(props.tag)

		if (tag === undefined) return undefined

		// Компонент в `tag` — редкость, и его не облегчали
		if (typeof tag === 'function') return untrack(() => dynamicRoot(() => tag, props))

		const node = nodeOf(
			tag,
			untrack(() => props.attributes().is),
		)
		const svg = SVGElements.has(tag)
		// Записанное — память `assign`: следующий проход пишет только разницу
		const assigned: Record<string, unknown> = {}

		// Порядок — как у спреда `Dynamic`: содержимое, `ref`, атрибуты
		insert(node, () => props.children)
		use(props.ref, node)
		createRenderEffect(() => assign(node, props.attributes(), svg, true, assigned, true))

		return node
	})

	// Само мемо, а не фрагмент: фрагмент над ним — ещё мемо на каждый корень
	return root
}
