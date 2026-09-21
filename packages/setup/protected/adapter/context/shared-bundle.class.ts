/**
 * TSharedBundle — набор не наш: чужой (фасад коллекции делит набор с компонентом) или никакого.
 *
 * Участники — только плагины дескриптора, которые в наборе нашлись; плагин,
 * которого там нет, молча пропускается. Регистрации приложения не
 * пересматриваются — иначе фасад получил бы плагин реестра второй раз.
 * Начальные значения плагинам не пишутся, плагины снаружи не ведутся, набор и
 * узел при `destroy()` не трогаются: всё это делает владелец набора.
 *
 * Компонент без плагинов сюда же: набора у него нет, и вести нечего.
 */

import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor } from '../../define'
import { TMember } from '../exchange/member.class'
import type { IBundleTenancy } from './types'

export class TSharedBundle implements IBundleTenancy {
	readonly members: readonly TMember[]
	/** Чужим плагинам начальные значения пишет владелец набора. */
	readonly seeded: readonly TMember[] = []

	constructor(
		descriptor: Pick<IComponentDescriptor, 'plugins'>,
		readonly bundle: IPluginBundle | null,
	) {
		this.members = descriptor.plugins.flatMap((plugin) => {
			const owner = bundle?.get(plugin.ctor)

			return owner ? [new TMember(owner, plugin.props, plugin.events)] : []
		})
	}

	complete(): void {}

	destroy(): void {}
}
