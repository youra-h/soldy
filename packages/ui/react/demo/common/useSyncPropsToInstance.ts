import { useEffect } from 'react'

/**
 * Синхронизирует значения props с core-инстансом.
 * Пропускает undefined и одинаковые значения (сеттеры core всё равно guard'ят).
 */
export function useSyncPropsToInstance(instance: any, props: Record<string, any>): void {
	useEffect(() => {
		for (const key of Object.keys(props)) {
			const value = props[key]

			if (value === undefined) continue

			if (instance[key] !== value) {
				instance[key] = value
			}
		}
	}, [instance, props])
}
