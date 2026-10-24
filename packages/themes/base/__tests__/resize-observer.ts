import { expect, vi } from 'vitest'

/** Запись наблюдателя, которую читают плагины раскладки: узел и его рамка по оси блока. */
type TResizeEntry = {
	readonly target: Element
	readonly borderBoxSize: readonly { readonly blockSize: number }[]
}

/**
 * Наблюдатель размеров вместо браузерного — для спеков плагинов раскладки. В
 * jsdom нет ни `ResizeObserver`, ни раскладки, поэтому размер узла сообщает сам
 * тест (`resize`), как браузер в шаге отрисовки, и видит, за какими узлами
 * плагин следит (`observed`).
 */
class TResizeObserverStub {
	static readonly instances: TResizeObserverStub[] = []

	private readonly _observed = new Set<Element>()

	constructor(private readonly _callback: (entries: TResizeEntry[]) => void) {
		TResizeObserverStub.instances.push(this)
	}

	get observed(): readonly Element[] {
		return [...this._observed]
	}

	observe(target: Element): void {
		this._observed.add(target)
	}

	unobserve(target: Element): void {
		this._observed.delete(target)
	}

	disconnect(): void {
		this._observed.clear()
	}

	/** Узел сменил размер: запись получает наблюдатель, который за ним следит. */
	resize(target: Element, blockSize: number): void {
		if (this._observed.has(target)) this._callback([{ target, borderBoxSize: [{ blockSize }] }])
	}
}

/** Подменить `ResizeObserver` на время теста; вернуть — `vi.unstubAllGlobals()`. */
export function stubResizeObserver(): void {
	TResizeObserverStub.instances.length = 0
	vi.stubGlobal('ResizeObserver', TResizeObserverStub)
}

/** Узлы, за которыми следят наблюдатели теста. */
function observedNodes(): Element[] {
	return TResizeObserverStub.instances.flatMap(({ observed }) => observed)
}

/**
 * Наблюдатели теста следят ровно за этими узлами — за теми же, а не за
 * равными: `toEqual` сравнивает узлы DOM по устройству (`isEqualNode`), и
 * соседний тост с той же разметкой прошёл бы за передний.
 */
export function expectObserved(...nodes: readonly Element[]): void {
	const observed = observedNodes()

	expect(observed).toHaveLength(nodes.length)
	nodes.forEach((node, index) => expect(observed[index]).toBe(node))
}

/** Узел сменил размер по оси блока — как его сообщил бы браузер. */
export function resize(target: Element, blockSize: number): void {
	for (const observer of TResizeObserverStub.instances) observer.resize(target, blockSize)
}
