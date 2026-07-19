/**
 * Чистая функция: собирает IComponentModel из массива IContribution и/или IComponentModel.
 * Принимает отдельный элемент или массив.
 * IComponentModel (родитель) — наследуется как есть (props + events копируются напрямую).
 * IContribution — компилируется: добавляется ownerId, нормализуется mutable.
 * Не имеет доступа к instance, плагинам, эмиттерам.
 */

import type { IComponentModel, IContractProp, IContribution } from '../contract'

type TCompileSource = IContribution | IComponentModel

export function compileComponent(
	sources: TCompileSource | TCompileSource[],
): IComponentModel {
	const arr = Array.isArray(sources) ? sources : [sources]
	const props: IContractProp[] = []
	const events: string[] = []

	for (const source of arr) {
		if ('id' in source) {
			// IContribution — компилируем
			props.push(
				...source.props.map((p) => ({
					...p,
					mutable: p.kind === 'computed' ? false : (p.mutable ?? true),
					ownerId: source.id,
				})),
			)
			events.push(...source.events)
		} else {
			// IComponentModel — наследуем как есть
			props.push(...source.props)
			events.push(...source.events)
		}
	}

	return { props, events: [...new Set(events)] }
}
