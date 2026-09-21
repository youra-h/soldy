/**
 * TMember — участник монтирования: владелец и то, что он объявляет наружу.
 *
 * Инстанс, плагин дескриптора, плагин, поставленный снаружи, и сама связка
 * (владелец `pluginProps`) — участники одного вида. Обмену безразлично, кто
 * есть кто: он получает список участников и строит линии. «Плагина в чужом
 * наборе нет» означает, что нет участника, — и ни одна проверка дальше по коду
 * не нужна.
 */

import type { TName, TPropSpec } from '../../define'

export class TMember {
	constructor(
		readonly owner: object,
		readonly props: readonly TPropSpec[],
		/** Явные события владельца. Триггеры пропсов публикуются и без объявления здесь. */
		readonly events: readonly TName[] = [],
	) {}

	/** Публикует ли участник событие с таким полным именем: явно или триггером пропа. */
	publishes(fullName: string): boolean {
		return (
			this.events.some((name) => name.getName() === fullName) ||
			this.props.some((spec) =>
				spec.triggers.some((trigger) => trigger.getName() === fullName),
			)
		)
	}
}
