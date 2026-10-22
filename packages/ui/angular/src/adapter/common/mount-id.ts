/**
 * Id монтирования — номер сборки компонента в приложении с префиксом `APP_ID`.
 * `useId` у Angular нет, но полная гидратация собирает компоненты в том же
 * порядке, что сервер. Счётчик — у приложения: сервер рисует каждый запрос
 * своим. AGENTS.md (Angular), «Id монтирования — номер сборки в приложении».
 */

import { APP_ID, InjectionToken, inject } from '@angular/core'

const MOUNT_ID = new InjectionToken<() => string>('soldy:mount-id', {
	providedIn: 'root',
	factory: () => {
		const prefix = inject(APP_ID)
		let count = 0

		return () => `${prefix}-${++count}`
	},
})

/** Зовётся в контексте инъекции компонента. */
export function nextMountId(): string {
	return inject(MOUNT_ID)()
}
