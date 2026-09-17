/**
 * Список регистраций на тип компонента: отмена и выбор подходящих компоненту.
 *
 * Одно правило на оба реестра — плагинов и расширений коллекции. Компонент
 * получает регистрацию, если он `instanceof` её типа: так подходит и
 * наследник, переданный через `ctrl`. Вложенный компонент — деталь чужой
 * разметки, помеченная признаком `embedded`, — получает только регистрации со
 * `scope: 'all'`; по умолчанию `scope` — `'own'`.
 *
 * Регистрация действует на компоненты, собранные после неё: уже собранных не
 * касаются ни она, ни её отмена.
 */

import type { IRegistration, IRegistrations } from './types'

/** Пустой список регистраций; у каждого реестра свой. */
export function createRegistrations<TEntry>(): IRegistrations<TEntry> {
	const registrations: IRegistration<TEntry>[] = []

	return {
		add(type, entries, options) {
			const registration: IRegistration<TEntry> = {
				type,
				entries,
				scope: options.scope ?? 'own',
			}

			registrations.push(registration)

			return () => {
				const index = registrations.indexOf(registration)

				if (index !== -1) registrations.splice(index, 1)
			}
		},

		select(instance, context) {
			const selected: TEntry[] = []

			for (const { type, entries, scope } of registrations) {
				if (!(instance instanceof type)) continue
				if (scope === 'own' && context.embedded !== undefined) continue

				selected.push(...entries)
			}

			return selected
		},
	}
}
