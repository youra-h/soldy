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
		props: (contribution.props ?? []).map((p) => ({
			name: new TName(p.name, namespace),
			type: p.type,
			protected: !!p.protected,
			triggers: (p.triggers ?? []).map((t) => new TName(t, namespace)),
			get: p.get,
			set: p.set,
		})),
		events: (contribution.events ?? []).map((e) => new TName(e, namespace)),
	}
}
