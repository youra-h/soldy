/**
 * useElevator — лифт сборки компонента: фабрика лифтов для его расширений.
 *
 * Зовёт его setup-функция компонента — один раз, в начале сборки, — и отдаёт
 * фабрику всем своим расширениям. Лифты фабрики делят слой сборки (см.
 * `TSvelteElevator`): ключ опускает одно расширение, а читает другое, и
 * `up()` отдаёт значение предка в любом порядке — и после `down()` того же
 * ключа. Так пункт с подменю берёт коллекцию меню над ним, а опускает свою.
 * Вторая фабрика в той же сборке опущенного первой не знала бы, и её `up()`
 * отдал бы своё: фабрика — одна на сборку.
 *
 * Тем же лифтом API тостов берёт `useToasts()` (`adapter/toasts/`) — при
 * инициализации компонента под менеджером: опускать ему нечего.
 *
 * Читают и пишут лифты фабрики при инициализации компонента: только тогда
 * Svelte отдаёт его контекст.
 */

import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TSvelteElevator } from './elevator.class'

export function useElevator(): TElevatorFactory {
	const inherited = new Map<symbol, unknown>()

	return <T>(key: IElevatorKey<T>) => new TSvelteElevator<T>(key.name, inherited)
}
