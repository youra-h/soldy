/**
 * useSyncEvents — проброс событий из Core в колбэки-пропсы React (`onXxx`).
 *
 * Список подписок дедуплицирован (см. collectEventBindings): один raw-триггер
 * объявлен у нескольких пропов, без дедупликации `onChangeVisible` вызывался
 * бы дважды на одно изменение.
 */

import { useLayoutEffect, useRef } from 'react'
import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'
import { collectEventBindings } from '@soldy/setup'

export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	props: Record<string, any>,
): void {
	const propsRef = useRef(props)
	propsRef.current = props

	// useLayoutEffect: подписка до первой отрисовки, чтобы не пропустить
	// события, привязанные к DOM (например, `ready` из TElementPlugin через rAF).
	useLayoutEffect(() => {
		const offs: Array<() => void> = []

		for (const { source, rawName, exportName } of collectEventBindings(accessor, inspector)) {
			const handler = (...args: any[]) => {
				propsRef.current[exportName]?.(...args)
			}

			source.on(rawName, handler)
			offs.push(() => source.off(rawName, handler))
		}

		return () => offs.forEach((off) => off())
	}, [accessor, inspector])
}
