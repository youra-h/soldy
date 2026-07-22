/**
 * compileContribution — компилирует сырую контрибуцию в скомпилированные props и events.
 * Если передан namespace, он добавляется к каждому триггеру.
 */

import type { IContribution, ICompiledProp, ICompiledEvent } from '@soldy/provider'

export function compileContribution(
    contribution?: IContribution,
    namespace?: string,
): { props: ICompiledProp[]; events: ICompiledEvent[] } {
    if (!contribution) return { props: [], events: [] }

    const props: ICompiledProp[] = (contribution.props ?? []).map((p) => ({
        name: p.name,
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
