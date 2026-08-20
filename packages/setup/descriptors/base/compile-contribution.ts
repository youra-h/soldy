/**
 * compileContribution — компилирует сырую контрибуцию в скомпилированные props и events.
 * Если передан namespace, он добавляется к каждому триггеру.
 */

import type { IContribution, ICompiledProp, ICompiledEvent, ICollectionContribution, ICompiledCollectionProp } from '@soldy/accessor'

/**
 * Объединяет несколько contributions в одну.
 * Props и events сливаются без дедупликации — считается, что дубликатов нет.
 */
export function mergeContributions(...contributions: (IContribution | undefined)[]): IContribution {
	const props = contributions.flatMap((c) => c?.props ?? [])
	const events = contributions.flatMap((c) => c?.events ?? [])

	return {
		props: props.length > 0 ? props : undefined,
		events: events.length > 0 ? events : undefined,
	}
}

export function compileContribution(
    contribution?: IContribution,
    namespace?: string,
): { props: ICompiledProp[]; events: ICompiledEvent[] } {
    if (!contribution) return { props: [], events: [] }

    const props: ICompiledProp[] = (contribution.props ?? []).map((p) => ({
        name: p.name,
        type: p.type,
        protected: !!p.protected,
        // Если есть namespace, проставляем его каждому триггеру
        // (например: 'change:visible' → 'element:change:visible')
        triggers: (p.triggers ?? []).map((t) => (namespace ? `${namespace}:${t}` : t)),
        namespace,
    }))

    const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
        name,
        namespace,
    }))

    return { props, events }
}

/** Компилирует коллекционную контрибуцию, сохраняя get/set геттеры. */
export function compileCollectionContribution(
	contribution?: ICollectionContribution,
	namespace?: string,
): { props: ICompiledCollectionProp[]; events: ICompiledEvent[] } {
	if (!contribution) return { props: [], events: [] }

	const props: ICompiledCollectionProp[] = (contribution.props ?? []).map((p) => ({
		name: p.name,
		type: p.type,
		protected: !!p.protected,
		triggers: (p.triggers ?? []).map((t) => (namespace ? `${namespace}:${t}` : t)),
		namespace,
		get: p.get,
		set: p.set,
	}))

	const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
		name,
		namespace,
	}))

	return { props, events }
}
