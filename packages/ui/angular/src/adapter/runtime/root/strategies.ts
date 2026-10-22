/**
 * Стратегии корня (`TRootSpec`): что делать с элементом потребителя и где
 * корень. Зовутся из конструктора базы — эффектам, `inject` и
 * `HostAttributeToken` нужен контекст инъекции компонента.
 */

import { computed, signal, type Signal } from '@angular/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import { applyStyles, type TRootStyles } from '../root-attributes'
import { teleportRoot } from '../teleport'
import { clearInputAttributes, forwardRegistry, forwardTo, hostElement } from './host-element'
import { NO_APPLIED_STYLES, hideCompanion, paintRoot, type TNode } from './paint'
import type { TRootHost, TRootPaint, TRootSpec, TRootTeleport } from './spec'

/** Что стратегии нужно от базы. Сигналы читаются лениво, после конструктора. */
export type TRootContext = {
	/** `ctrl` и имена входов. */
	readonly own: readonly string[]
	readonly state: Signal<TStateSnapshot>
	/** Что база рисует на корне: у слоя не на своём месте — ничего. */
	readonly drawn: Signal<TStateSnapshot>
	/** Внешний узел компонента скрыт. */
	readonly hidden: Signal<boolean>
	/** Узлы шаблона `#root`, `#control`, `#companion`. */
	readonly root: TNode
	readonly control: TNode
	readonly companion: TNode
}

/** Что стратегия отдаёт базе. */
export type TRoot = {
	/** Тег корня-хоста для ядра; у корня в шаблоне — умолчание ядра. */
	readonly tag: string | undefined
	/** Узел корня для плагинов и шаблона. */
	readonly node: TNode
	readonly placed: Signal<boolean>
	/** Видимость прячет внешний узел. */
	readonly hides: boolean
	/** Внешний узел прячет стиль корня, а не привязка хоста `[style.display]`. */
	readonly hidesRoot: boolean
	readonly shownBy: string | undefined
	/** Корень уезжает в слой и прячется по признаку поддерева предка. */
	readonly layer: boolean
}

const IN_PLACE: Signal<boolean> = signal(true).asReadonly()
const WRAPPED_PAINT: TRootPaint = {}
const BOXLESS: TRootStyles = new Map([['display', 'contents']])

export function createRoot(spec: TRootSpec, ctx: TRootContext): TRoot {
	switch (spec.strategy) {
		case 'host':
			return hostRoot(spec, ctx)
		case 'wrapped':
			return spec.teleport ? layeredRoot(spec.teleport, ctx) : wrappedRoot(ctx)
		case 'view':
			return viewRoot(ctx)
	}
}

/** Корень — сам элемент потребителя. */
function hostRoot(spec: TRootHost, ctx: TRootContext): TRoot {
	const host = hostElement()
	// Без рендерера адаптера поле не собирается — до всего остального
	const registry = spec.control ? forwardRegistry(host) : null
	const target = (): Element => host
	const placed = spec.teleport ? teleport(target, spec.teleport, ctx) : IN_PLACE

	clearInputAttributes(host, ctx.own)
	paintRoot(target, spec, ctx.drawn)

	if (registry) forwardTo(registry, host, ctx.control, ctx.own)

	return {
		tag: host.localName,
		node: target,
		placed,
		hides: spec.hides ?? true,
		hidesRoot: false,
		shownBy: spec.shownBy,
		layer: spec.teleport !== undefined,
	}
}

/** Корень — `#root` внутри обёртки (окно таблицы): класс и стиль — обёртке, остальное — корню. */
function wrappedRoot(ctx: TRootContext): TRoot {
	const wrapper = hostElement()
	const registry = forwardRegistry(wrapper)

	clearInputAttributes(wrapper, ctx.own)
	forwardTo(registry, wrapper, ctx.root, ctx.own)
	paintRoot(ctx.root, WRAPPED_PAINT, ctx.drawn)

	return {
		tag: undefined,
		node: ctx.root,
		placed: IN_PLACE,
		hides: true,
		hidesRoot: false,
		shownBy: undefined,
		layer: false,
	}
}

/**
 * Корень внутри обёртки уезжает в слой (регион тостов): обёртка — место без
 * своей коробки, и всё написанное на ней, класс и стиль тоже, — корню.
 */
function layeredRoot(names: TRootTeleport, ctx: TRootContext): TRoot {
	const wrapper = hostElement()
	const registry = forwardRegistry(wrapper)
	const placed = teleport(ctx.root, names, ctx)

	clearInputAttributes(wrapper, ctx.own)
	forwardTo(registry, wrapper, ctx.root, ctx.own, { boxless: true })
	// Статика потребителя уже снята: поверх своей коробки ничего не осталось
	applyStyles(wrapper, BOXLESS, NO_APPLIED_STYLES)
	paintRoot(ctx.root, WRAPPED_PAINT, ctx.drawn, ctx.hidden)

	return {
		tag: undefined,
		node: ctx.root,
		placed,
		hides: true,
		hidesRoot: true,
		shownBy: undefined,
		layer: true,
	}
}

/** Корень в шаблоне (`#root`) или его нет вовсе. */
function viewRoot(ctx: TRootContext): TRoot {
	return {
		tag: undefined,
		node: ctx.root,
		placed: IN_PLACE,
		hides: false,
		hidesRoot: false,
		shownBy: undefined,
		layer: false,
	}
}

/** Слой: цель и «на месте» — из состояния по именам выходов, которые назвал компонент. */
function teleport(root: TNode, names: TRootTeleport, ctx: TRootContext): Signal<boolean> {
	const { contained } = names
	const companion = names.companion ? ctx.companion : undefined

	if (companion) hideCompanion(companion, ctx.hidden)

	return teleportRoot(
		root,
		{
			target: computed(() => {
				const value = ctx.state()[names.target]

				return typeof value === 'string' && value !== '' ? value : null
			}),
			contained: computed(() => contained !== undefined && ctx.state()[contained] === true),
		},
		companion,
	)
}
