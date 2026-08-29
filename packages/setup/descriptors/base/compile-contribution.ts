/**
 * normalizeContribution — нормализует contribution в единый формат {props, events}.
 * Строки конвертируются в TName; namespace применяется к каждому имени.
 */

import { TName, type IContribution, type IPropDeclaration } from '@soldy/accessor'

export function normalizeContribution(
	contribution?: IContribution,
	namespace?: string,
): { props: IPropDeclaration[]; events: TName[] } {
	if (!contribution) return { props: [], events: [] }

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
	}
}
