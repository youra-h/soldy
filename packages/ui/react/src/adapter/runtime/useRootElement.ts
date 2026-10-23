/**
 * useRootElement — корень компонента значением рендера: `null` на сервере и до
 * коммита, узел — после. AGENTS.md (React), «Корень и `ref` потребителя».
 */

import { useSyncExternalStore } from 'react'
import type { TRootSource } from './root-ref.class'

const onServer = (): null => null

export function useRootElement(source: TRootSource): Element | null {
	return useSyncExternalStore(source.subscribe, source.getSnapshot, onServer)
}
