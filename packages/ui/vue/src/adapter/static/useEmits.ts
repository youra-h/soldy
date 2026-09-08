/**
 * Статический хелпер для сборки emits во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

export function useEmits(descriptor: IComponentDescriptor): string[] {
	const inspector = createInspector(descriptor)
	const emits = inspector.getExportEvents()

	// `getProps()`, а не `props`: второе — только собственные пропы компонента,
	// без плагинных. А `useSyncEvents` эмитит `update:` по `getProps(false)`,
	// куда плагинные входят, — и Vue ругался на каждый такой проп, что событие
	// не объявлено (`update:anchor_anchor` у Frame). Объявление и эмит обязаны
	// ходить по одному набору; инспектор выше уже собран из `getProps()`.
	for (const prop of descriptor.getProps()) {
		if (!prop.protected && prop.triggers && prop.triggers.length > 0) {
			emits.push(`update:${inspector.getExportPropName(prop)}`)
		}
	}

	return Array.from(new Set(emits))
}
