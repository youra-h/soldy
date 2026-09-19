/**
 * surfaceOf — публичная поверхность компонента в именах фреймворка, одна на пару «дескриптор × профиль».
 *
 * Раньше то же самое вычислял инспектор — заново на каждом монтировании и в
 * двух режимах: по дескриптору при импорте модуля компонента и по аксессору в
 * рантайме. Факт при этом один — свойство типа, а не монтирования: пропсы
 * внешних плагинов идут через `pluginProps`, а дескриптор строится один раз
 * (`defineDescriptor`). Поэтому поверхность считается один раз и кэшируется.
 */

import type { IPropDeclaration } from '@soldy/accessor'
import type { IComponentDescriptor } from '../../define'
import { resolveSlotName } from '../common/slots'
import type {
	IAdapterProfile,
	ISurface,
	ISurfaceEvent,
	ISurfaceModel,
	ISurfaceProp,
	TSurfacePropConfig,
} from './types'

const surfaces = new WeakMap<IComponentDescriptor, WeakMap<IAdapterProfile, ISurface>>()

/**
 * Проп для статического слоя: тип и умолчание, если декларация их объявила. У
 * умолчания значим ключ, а не значение (см. `IPropDeclaration.default`): без
 * ключа поля нет и в результате.
 */
function exportConfig(declaration: IPropDeclaration): TSurfacePropConfig {
	return {
		...(declaration.type !== undefined ? { type: declaration.type } : {}),
		...(Object.hasOwn(declaration, 'default') ? { default: declaration.default } : {}),
	}
}

function buildSurface(descriptor: IComponentDescriptor, profile: IAdapterProfile): ISurface {
	const { naming, defaultSlot, model } = profile
	const declarations = descriptor.getProps()

	const props: ISurfaceProp[] = declarations.map((declaration) => ({
		key: declaration.name.getName(),
		name: declaration.name,
		exportName: naming.prop(declaration.name),
		protected: !!declaration.protected,
		triggers: (declaration.triggers ?? []).map((trigger) => ({
			raw: trigger.name,
			exportName: naming.event(trigger),
		})),
	}))

	const events: ISurfaceEvent[] = descriptor.getEvents().map((name) => ({
		key: name.getName(),
		raw: name.name,
		exportName: naming.event(name),
	}))

	const exportProps: Record<string, TSurfacePropConfig> = {}

	for (const [index, prop] of props.entries()) {
		if (!prop.protected) exportProps[prop.exportName] = exportConfig(declarations[index])
	}

	// Модель — у записываемого свойства, за которым есть чем следить
	const models: ISurfaceModel[] = model
		? props
				.filter((prop) => !prop.protected && prop.triggers.length > 0)
				.map((prop) => ({ prop, exportName: model(prop.exportName) }))
		: []

	// Порядок — как у объявления: сгенерированные метаданные Angular его хранят
	const exportEvents = [
		...new Set([
			...events.map((event) => event.exportName),
			...props.flatMap((prop) => prop.triggers.map((trigger) => trigger.exportName)),
			...models.map((model) => model.exportName),
		]),
	]

	// `ctrl` и `embedded` принимает сам адаптер, а слот по умолчанию у
	// спредящих фреймворков называется `children`: без слотов в наборе
	// `leading={<Icon/>}` доезжал бы до DOM атрибутом
	const consumed = new Set<string>(['ctrl', 'embedded'])

	for (const prop of props) {
		consumed.add(prop.exportName)
		consumed.add(prop.name.name)

		for (const trigger of prop.triggers) consumed.add(trigger.exportName)
	}

	for (const event of events) consumed.add(event.exportName)

	for (const slot of descriptor.slots) {
		consumed.add(defaultSlot ? resolveSlotName(slot.name, defaultSlot) : slot.name)
	}

	if (defaultSlot) consumed.add(defaultSlot)

	return {
		props,
		inputs: props.filter((prop) => !prop.protected),
		events,
		models,
		exportProps,
		exportEvents,
		consumed,
	}
}

export function surfaceOf(descriptor: IComponentDescriptor, profile: IAdapterProfile): ISurface {
	let byProfile = surfaces.get(descriptor)

	if (!byProfile) {
		byProfile = new WeakMap()
		surfaces.set(descriptor, byProfile)
	}

	let surface = byProfile.get(profile)

	if (!surface) {
		surface = buildSurface(descriptor, profile)
		byProfile.set(profile, surface)
	}

	return surface
}
