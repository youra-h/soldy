/**
 * Метки узлов — по самому узлу, в слабых коллекциях, а не атрибутом: атрибут
 * оставил бы след в DOM и уехал бы с копией `cloneNode`. AGENTS.md (Web
 * Components), «Метки узлов».
 */

const owners = new WeakSet<Node>()
const ownerMarkup = new WeakSet<Element>()
const slotMarks = new WeakMap<Node, string>()
const assigned = new WeakMap<Node, string>()

/** Элемент собирает база: он хозяин места панелей, чей якорь стоит в нём. */
export function markPlaceOwner(element: Element): void {
	owners.add(element)
}

export function isPlaceOwner(node: Node): boolean {
	return owners.has(node)
}

/** Элемент построил шаблон библиотеки: его события не всплывают. */
export function markOwnerMarkup(element: Element): void {
	ownerMarkup.add(element)
}

export function isOwnerMarkup(element: Element): boolean {
	return ownerMarkup.has(element)
}

/** Комментарий задаёт слот детали и пустым (`lendMark`). */
export function markSlot(mark: Comment, slot: string): void {
	slotMarks.set(mark, slot)
}

export function isSlotMark(node: Node): boolean {
	return slotMarks.has(node)
}

export function slotOfMark(node: Node): string | undefined {
	return slotMarks.get(node)
}

/** Слот в свете детали, назначенный шаблоном владельца, — главнее атрибута `slot`. */
export function assignSlot(node: Node, slot: string): void {
	assigned.set(node, slot)
}

/** Назначение — на одну раскладку света: дальше узел живёт по своему атрибуту. */
export function takeAssignedSlot(node: Node): string | undefined {
	const slot = assigned.get(node)

	if (slot !== undefined) assigned.delete(node)

	return slot
}
