import { findComponent } from '../registry'
import { BUTTON_EVENTS } from './button/events'
import { BUTTON_SLOTS } from './button/slots'
import { eventsPoll } from './events-poll'
import type { TScenario } from './types'

/**
 * Опрос событий по строкам свойств. Подключён пока только Button: остальным
 * компонентам его раздаст одна строка здесь, когда до них дойдёт очередь.
 */
const POLLED = ['button']

/** Опечатка в `POLLED` не должна молча убрать опрос — пусть падает громко. */
function polled(id: string) {
	const entry = findComponent(id)

	if (!entry) throw new Error(`[playground] опрос событий: компонента «${id}» нет в реестре`)

	return entry
}

/**
 * Сценарии страницы тестов — каталог всей библиотеки, общий для стендов всех
 * фреймворков. Стенд показывает только те, что может нарисовать: компонент
 * есть в его превью, а фикстура — в его фикстурах.
 *
 * В CI сценарии не идут: упавший сценарий — найденная проблема компонента, а
 * не сломанная сборка. Стенд стерегут только тесты целостности реестра.
 */
export const SCENARIOS: readonly TScenario[] = [
	...BUTTON_EVENTS,
	...POLLED.flatMap((id) => eventsPoll(polled(id))),
	...BUTTON_SLOTS,
]
