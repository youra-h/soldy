import { useContext } from 'react'
import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { ElevatorContext } from '../elevator/layer'
import { TReactElevatorScope } from '../elevator/scope.class'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>` выше по дереву: `const { show } = useToasts()`.
 * Пересобранный менеджер — новый API, поэтому `show` — в зависимостях
 * эффекта. AGENTS.md (React), «Локаль и тосты».
 */
export function useToasts(): IToastsApi<TToastRender> {
	const layer = useContext(ElevatorContext)
	const api = new TReactElevatorScope(layer).elevator(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'useToasts(): выше по дереву нет <Toasts>. Оберните приложение менеджером: <Toasts><App /></Toasts>',
		)
	}

	return api
}
