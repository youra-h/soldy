/**
 * Элемент потребителя как хост компонента: проверка, что шаблон в него
 * отрисуется, снятие атрибутов-входов и перенос написанного на нём на узел
 * внутри. AGENTS.md (Angular), «Поле: атрибуты потребителя делятся».
 */

import {
	DestroyRef,
	ElementRef,
	HostAttributeToken,
	Renderer2,
	effect,
	inject,
} from '@angular/core'
import type { TForwardOptions } from '../../attrs/host'
import { TForwardRegistry } from '../../attrs/registry'
import { onNode, type TNode } from './paint'

/** Пустые элементы HTML и поля с текстом или опциями: шаблон в них не отрисуется. */
const NO_TEMPLATE_HOSTS: ReadonlySet<string> = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
	'textarea',
	'select',
])

const ELEMENT_NODE = 1

function isElement(node: Node): node is Element {
	return node.nodeType === ELEMENT_NODE
}

/**
 * Хост компонента с шаблоном — элемент, который держит содержимое. В
 * продакшене компонент на `<ng-container>` Angular не проверяет, и без этой
 * ошибки он упал бы на первой записи в узел без подсказки.
 */
export function assertTemplateHost(node: Node): asserts node is Element {
	if (!isElement(node)) {
		throw new Error(
			`@soldy-ui/angular: компонент на <ng-container> — у контейнера нет своего узла, а корню компонента нужен элемент: на него ложится всё, что написано на компоненте. Пишите компонент на элементе: по умолчанию это тег из селектора компонента (<div so-toasts>, <button so-button>).`,
		)
	}

	if (!NO_TEMPLATE_HOSTS.has(node.localName)) return

	throw new Error(
		`@soldy-ui/angular: <${node.localName}> не может быть корнем компонента — его шаблон в этот элемент не отрисуется. Пишите компонент на элементе, который держит содержимое: по умолчанию это тег из селектора компонента (<div so-input>, <span so-check-box>).`,
	)
}

/** Элемент потребителя, на котором стоит компонент. */
export function hostElement(): Element {
	// `Node`, а не `any`: на `<ng-container>` хост — комментарий
	const host = inject<ElementRef<Node>>(ElementRef).nativeElement

	assertTemplateHost(host)

	return host
}

/**
 * Реестр рендерера адаптера. Проверяется подмена рендерера, а не найденный
 * реестр; без неё — ошибка всегда: молча компонент работал бы наполовину.
 */
export function forwardRegistry(host: Element): TForwardRegistry {
	const registry = inject(TForwardRegistry, { optional: true })

	if (registry?.served) return registry

	throw new Error(
		`@soldy-ui/angular: компонент на <${host.localName}> отдаёт привязки ([attr.x], [title]) и слушатели ((focus)) своему внутреннему узлу, а донести их может только provideAttrs(). Подключите provideAttrs() из @soldy-ui/angular в providers приложения (appConfig) — и в браузере, и на сервере: в провайдерах маршрута или компонента он рендерер не подменит.`,
	)
}

/**
 * Статический атрибут с именем входа — запись входа: Angular ставит его на
 * элемент ещё до конструктора.
 */
export function clearInputAttributes(element: Element, own: readonly string[]): void {
	for (const name of own) element.removeAttribute(name)
}

/**
 * Написанное на хосте — узлу `target()`. Статику разметки база переносит сама,
 * привязки и слушатели доносит рендерер адаптера через запись хоста. Что
 * остаётся на хосте, решает запись — одно правило для обоих путей.
 *
 * Эффекты заводятся в этом порядке до раскладки корня: атрибуты потребителя
 * встают на узел раньше наборов ядра, и имя, которое называет ядро, остаётся
 * за ядром.
 */
export function forwardTo(
	registry: TForwardRegistry,
	host: Element,
	target: TNode,
	own: readonly string[],
	options: TForwardOptions = {},
): void {
	const forwarded = registry.register(host, own, options)

	moveAttributes(host, target, (name) => forwarded.keepsAttribute(name))
	effect(() => forwarded.attach(target()))
	inject(DestroyRef).onDestroy(() => forwarded.release())
}

/**
 * Чей атрибут, база узнаёт по скомпилированной разметке потребителя
 * (`HostAttributeToken`), а не по узлу: на узле стоят ещё инкапсуляция стилей и
 * разметка сервера. `HostAttributeToken` разрешается только в конструкторе.
 * Ставит их рендерер адаптера: узел бывает хостом сам (цепочка хостов).
 */
function moveAttributes(host: Element, target: TNode, stays: (name: string) => boolean): void {
	const moved = new Map<string, string>()

	for (const name of host.getAttributeNames()) {
		if (stays(name)) continue

		const value = inject(new HostAttributeToken(name), { optional: true })

		if (value === null) continue

		moved.set(name, value)
		host.removeAttribute(name)
	}

	if (moved.size === 0) return

	const renderer = inject(Renderer2)

	onNode(target, (node) => {
		for (const [name, value] of moved) renderer.setAttribute(node, name, value)
	})
}
