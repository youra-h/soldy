/**
 * Узлы частей без экземпляра, которых тысячи, — ячейки таблицы, поле флажка в
 * каждой её строке. Без спреда: спред на узле давал прокси `mergeProps`,
 * эффект `ref` и эффект атрибутов. На сервере — `createDynamic`, в
 * гидратации — узлы сервера. AGENTS.md (Solid), «Корень и узлы частей».
 *
 * - `createPartNode` — узел: атрибуты — один эффект, содержимое — вставкой;
 * - `createPartNodes` — узлы записей списка с текстом: одно мемо на весь
 *   список, без вычислений на узел.
 */

import { createRenderEffect, type Accessor, type JSX } from 'solid-js'
import { assign, createDynamic, getNextElement, insert, isServer } from 'solid-js/web'
import { createHeldMemo } from '../common/hydration'
import { createPartProps } from '../common/root'

/** Атрибуты узла: класс, наборы ядра — всё одним объектом. */
export type TPartNodeAttributes = Readonly<Record<string, unknown>>

/** Создатель узла на тег — один на модуль: узлов тысячи, тегов два. */
const creators = new Map<string, () => Element>()

function creatorOf(tag: string): () => Element {
	let creator = creators.get(tag)

	if (!creator) creators.set(tag, (creator = () => document.createElement(tag)))

	return creator
}

/** Узел на сервере: содержимое — геттером, после метки гидратации узла, как у разметки. */
function serverNode(tag: string, attributes: TPartNodeAttributes, children: () => JSX.Element) {
	return createDynamic(() => tag, {
		...attributes,
		get children() {
			return children()
		},
	})
}

/**
 * Узел `tag` с атрибутами `read` и содержимым `children` (без него — пустой,
 * как `input`). Зовётся там, где узел рисуется, — в теле или в функции петли:
 * эффекты узла уходят с его владельцем. Атрибуты в окне гидратации держит
 * `createPartProps`, как набор части.
 */
export function createPartNode(
	tag: string,
	read: () => TPartNodeAttributes,
	children?: () => JSX.Element,
): JSX.Element {
	if (isServer) return serverNode(tag, read(), () => children?.())

	// Узел сервера в окне гидратации, иначе — новый
	const node = getNextElement(creatorOf(tag))
	const attributes = createPartProps(read)
	// Записанное — память `assign`: следующий проход пишет только разницу
	const assigned: Record<string, unknown> = {}

	createRenderEffect(() => assign(node, attributes(), false, true, assigned, true))

	if (children) insert(node, children)

	return node
}

/** Узлы записей списка: узел на ключ, тег, атрибуты и текст — от записи. */
export type TPartNodesSource<TEntry, TKey> = {
	readonly each: () => readonly TEntry[] | undefined
	/** Ключ записи: у записей одного узла он один и тот же. */
	readonly by: (entry: TEntry) => TKey
	/** Тег узла — читается, когда узел создаётся: сменился — сменился и ключ. */
	readonly tag: (entry: TEntry) => string
	readonly attributes: (entry: TEntry) => TPartNodeAttributes
	readonly text: (entry: TEntry) => string
}

/** Узел записи и память записанного в него. */
type TPartNodeRecord = {
	readonly node: Element
	/** Память `assign`. */
	readonly assigned: Record<string, unknown>
	/** Текст в узле — для `insert`. */
	text: JSX.Element
}

/**
 * Узлы записей списка с текстом — одно мемо на список: узел живёт, пока в
 * списке есть запись с его ключом, а проход по записям пишет каждому узлу
 * атрибуты и текст — разницу с записанным. Корня, сигнала и эффекта на узел,
 * как у `KeyedFor`, нет. Узлы на место ставит вставка родителя. Окна
 * гидратации мемо переживает, как петли адаптера (`createHeldMemo`).
 */
export function createPartNodes<TEntry, TKey>(source: TPartNodesSource<TEntry, TKey>): JSX.Element
export function createPartNodes<TEntry, TKey>(
	source: TPartNodesSource<TEntry, TKey>,
): JSX.Element | Accessor<readonly Element[]> {
	if (isServer) {
		return source
			.each()
			?.map((entry) =>
				serverNode(source.tag(entry), source.attributes(entry), () => source.text(entry)),
			)
	}

	const records = new Map<TKey, TPartNodeRecord>()
	let shown: readonly Element[] = []

	const draw = (entries: readonly TEntry[]): readonly Element[] => {
		const seen = new Set<TKey>()
		const nodes = entries.map((entry) => {
			const key = source.by(entry)
			let record = records.get(key)

			if (!record) {
				const node = getNextElement(creatorOf(source.tag(entry)))

				records.set(key, (record = { node, assigned: {}, text: undefined }))
			}

			assign(record.node, source.attributes(entry), false, true, record.assigned, true)
			record.text = insert(record.node, source.text(entry), undefined, record.text)
			seen.add(key)

			return record.node
		})

		for (const key of records.keys()) if (!seen.has(key)) records.delete(key)

		// Те же узлы тем же порядком — тот же список: вставке родителя переставлять нечего
		if (nodes.length !== shown.length || nodes.some((node, index) => node !== shown[index]))
			shown = nodes

		return shown
	}

	return createHeldMemo(
		source,
		(current) => draw(current.each() ?? []),
		(current) => current.each(),
	)
}
