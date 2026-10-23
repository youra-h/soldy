/**
 * Перенос силами базы — не отключение. Телепорт и раскладка света переносят
 * узлы, не выводя из документа, и колбэки, которые это вызвало, связку не
 * трогают. Признак держится до микрозадачи после переноса: с полифилом
 * колбэки приходят позже. AGENTS.md (Web Components), «Перенос силами базы».
 */

type TTransfer = {
	readonly order: number
	readonly rebuilds: boolean
}

/** Набор, а не флаг: узел могли перенести снова, пока держится прошлый признак. */
const moving = new Map<Node, Set<TTransfer>>()

let last = 0

/** Элементы с долгом: следующее отключение — настоящее. */
const owing = new WeakSet<Element>()

function above(node: Node): Node | null {
	const parent = node.parentNode

	return parent instanceof ShadowRoot ? parent.host : parent
}

function transfer(nodes: readonly Node[], rebuilds: boolean, move: () => void): void {
	const current: TTransfer = { order: ++last, rebuilds }

	for (const node of nodes) {
		const transfers = moving.get(node) ?? new Set<TTransfer>()

		transfers.add(current)
		moving.set(node, transfers)
	}

	try {
		move()
	} finally {
		queueMicrotask(() => {
			for (const node of nodes) {
				const transfers = moving.get(node)

				transfers?.delete(current)

				if (transfers?.size === 0) moving.delete(node)
			}
		})
	}
}

/** `move` — операции DOM, после которых узлы остаются в документе. */
export function relocate(nodes: readonly Node[], move: () => void): void {
	transfer(nodes, false, move)
}

/** Перенос, чьи колбэки — настоящие, какой бы перенос базы ни держался над узлами. */
export function rebuild(nodes: readonly Node[], move: () => void): void {
	transfer(nodes, true, move)
}

/** Узел снова в документе, и последний перенос на пути вверх — силами базы. */
export function isRelocating(node: Node): boolean {
	if (moving.size === 0 || !node.isConnected) return false

	let latest: TTransfer | undefined

	for (let each: Node | null = node; each !== null; each = above(each)) {
		for (const transfer of moving.get(each) ?? []) {
			if (latest === undefined || transfer.order > latest.order) latest = transfer
		}
	}

	return latest !== undefined && !latest.rebuilds
}

/** Элементы, которые переставила операция потребителя: их отключение — настоящее. */
export function owe(elements: Iterable<Element>): void {
	for (const element of elements) owing.add(element)
}

/** Решает колбэк отключения, один раз на отключение: долг гасится. */
export function keepsBinding(element: Element): boolean {
	if (owing.delete(element)) return false

	return isRelocating(element)
}
