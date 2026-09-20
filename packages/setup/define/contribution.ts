/**
 * normalizeContribution — contribution в описания: пропсы (`TPropSpec`), события (`TName`) и слоты.
 *
 * Неймспейс применяется к каждому имени пропа, триггера и события. Слоты
 * неймспейса не получают: они принадлежат компоненту, а у плагинов слотов нет
 * вовсе — плагин не рендерит.
 *
 * Умолчаний у описаний здесь ещё нет: умолчание принадлежит классу владельца, и
 * приставляет его тот, кто класс знает, — дескриптор (`TPropSpec.rebase`) или
 * определение плагина.
 */

import type { IContribution } from './contribution.types'
import { TName } from './name.class'
import { TPropSpec } from './prop-spec.class'
import { TSlotDeclaration } from './slot-declaration.class'

export function normalizeContribution(
	contribution?: IContribution,
	namespace?: string,
): { props: TPropSpec[]; events: TName[]; slots: TSlotDeclaration[] } {
	if (!contribution) return { props: [], events: [], slots: [] }

	return {
		props: Object.entries(contribution.props ?? {}).map(
			([name, definition]) =>
				new TPropSpec(
					new TName(name, namespace),
					Object.freeze(
						(definition.triggers ?? []).map((trigger) => new TName(trigger, namespace)),
					),
					definition,
				),
		),
		events: (contribution.events ?? []).map((event) => new TName(event, namespace)),
		slots: Object.entries(contribution.slots ?? {}).map(
			([name, definition]) =>
				new TSlotDeclaration(name, definition.scope, definition.description),
		),
	}
}
