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
	options: { flatProps?: boolean } = {},
): { props: IPropDeclaration[]; events: TName[]; slots: ISlotDeclaration[] } {
	if (!contribution) return { props: [], events: [], slots: [] }

	/**
	 * `flatProps` снимает namespace **только с пропов и их триггеров**.
	 *
	 * Нужен плагинам, которые не добавляют поведение сбоку, а дают компоненту
	 * свойства: у списка это `maxRows`, `wordWrap`, `autoWidth`,
	 * `scrollBehavior`. Наружу они обязаны выглядеть как обычные пропы
	 * компонента — `maxRows`, а не `layout_maxRows`.
	 *
	 * События namespace сохраняют всегда: `create` есть у каждого плагина, и
	 * без префикса два плагина на одном компоненте эмитили бы неразличимое
	 * событие.
	 */
	const propNamespace = options.flatProps ? undefined : namespace

	return {
		props: Object.entries(contribution.props ?? {}).map(([name, def]) => ({
			name: new TName(name, propNamespace),
			type: def.type,
			protected: !!def.protected,
			triggers: (def.triggers ?? []).map((t) => new TName(t, propNamespace)),
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
