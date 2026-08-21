/**
 * normalizeContribution — нормализует contribution в единый формат {props, events}
 * @param contribution — contribution, который нужно нормализовать
 * @returns {props, events} — нормализованный contribution
 */

import type { IContribution, IPropDeclaration } from '@soldy/accessor'

export function normalizeContribution(contribution?: IContribution): {
	props: IPropDeclaration[]
	events: string[]
} {
	if (!contribution) return { props: [], events: [] }

	return {
		props: (contribution.props ?? []).map((p) => ({
			name: p.name,
			type: p.type,
			protected: !!p.protected,
			triggers: p.triggers ?? [],
			get: p.get,
			set: p.set,
		})),
		events: contribution.events ?? [],
	}
}
