/**
 * Состав компонента на одно монтирование: плагины дескриптора, затем реестра.
 *
 * Один список на всё, что дальше по цепочке спрашивает «из чего собран этот
 * компонент»: набор плагинов, аксессор, начальные значения плагинных пропсов.
 * Раньше каждый из них выяснял состав сам, и плагины реестра доходили только до
 * набора, а остальным приходилось узнавать о них боковым каналом.
 *
 * Библиотека и внешние слои (тема, приложение) попадают в список одинаково, но
 * объявлять пропсы и события в поверхности вправе только дескриптор: у записей
 * реестра деклараций нет, их контракт ведёт контекст через `pluginProps`
 * (AGENTS.md, «Внешний плагин: пропсы — `pluginProps`, события — `plugin:event`»).
 */

import { resolveRegisteredPlugins } from '../registry'
import type { IBundleContext, IComponentDescriptor } from '../define/types'
import type { ICompositionEntry } from './types'

/**
 * Состав для этого монтирования. Плагины реестра идут после плагинов
 * дескриптора: они зависят от плагинов компонента, а не наоборот. Заменить
 * плагин из состава внешний не может — набор компонента его инвариант
 * (AGENTS.md, «Почему bundle не принимается снаружи»).
 */
export function resolveComposition(
	descriptor: Pick<IComponentDescriptor, 'ctor' | 'plugins'>,
	instance: object,
	context: IBundleContext,
): readonly ICompositionEntry[] {
	// Без своих плагинов у компонента нет и узла для них (`TElementPlugin`):
	// плагины реестра такому компоненту не ставятся
	if (descriptor.plugins.length === 0) return []

	const composition: ICompositionEntry[] = [...descriptor.plugins]
	const own = new Set(descriptor.plugins.map((plugin) => plugin.ctor))

	for (const plugin of resolveRegisteredPlugins(instance, context)) {
		if (own.has(plugin.ctor)) {
			throw new Error(
				`${plugin.ctor.name} уже входит в состав ${descriptor.ctor.name}: плагин реестра только добавляет`,
			)
		}

		composition.push(plugin)
	}

	return composition
}
