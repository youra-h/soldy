/**
 * normalizeContribution — нормализует contribution в единый формат
 * {props, events, slots}. Строки конвертируются в TName; namespace применяется
 * к каждому имени.
 *
 * Слоты namespace не получают: они принадлежат компоненту, а не плагину.
 * У плагинов слотов нет вовсе — плагин не рендерит.
 */

import {
	TName,
	type IContribution,
	type IPropDeclaration,
	type ISlotDeclaration,
} from '@soldy/accessor'

export function normalizeContribution(
	contribution?: IContribution,
	namespace?: string,
): { props: IPropDeclaration[]; events: TName[]; slots: ISlotDeclaration[] } {
	if (!contribution) return { props: [], events: [], slots: [] }

	return {
		props: Object.entries(contribution.props ?? {}).map(([name, def]) => ({
			name: new TName(name, namespace),
			type: def.type,
			protected: !!def.protected,
			triggers: (def.triggers ?? []).map((t) => new TName(t, namespace)),
			get: def.get,
			set: def.set,
		})),
		events: (contribution.events ?? []).map((e) => new TName(e, namespace)),
		slots: Object.entries(contribution.slots ?? {}).map(([name, def]) => ({
			name,
			scope: def.scope,
			description: def.description,
		})),
	}
}
