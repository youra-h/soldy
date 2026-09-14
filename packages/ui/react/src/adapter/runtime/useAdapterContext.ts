/**
 * useAdapterContext — держит adapter-context между рендерами (аналог того,
 * что во Vue делает `setup()`, вызываемый один раз за жизнь компонента).
 *
 * Компонент передаёт фабрику (обычно `() => createAdapterContext(XDescriptor(), ...)`),
 * хук вызывает её один раз при первом рендере и на всех следующих отдаёт тот
 * же объект. Держим через `useRef`, а не `useMemo`: React вправе сбросить кэш
 * `useMemo` и пересоздать значение, а `useAdapter` уничтожит старый adapter-context
 * по зависимости `[adapter]` — второй адаптер за жизнь компонента не предусмотрен.
 */

import { useRef } from 'react'
import type { IAdapterContext } from '@soldy/setup'

export function useAdapterContext<TInstance extends object>(
	factory: () => IAdapterContext<TInstance>,
): IAdapterContext<TInstance> {
	const ref = useRef<IAdapterContext<TInstance> | null>(null)

	if (!ref.current) {
		ref.current = factory()
	}

	return ref.current
}
