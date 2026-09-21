/**
 * createAdapterContext — сборка компонента на монтирование: шесть шагов, сверху вниз.
 *
 * 1. Инстанс — `ctrl` или конструктор дескриптора.
 * 2–3. Набор плагинов: свой (`TOwnBundle`) или не свой (`TSharedBundle`).
 * 4. Участники обмена: инстанс, затем то, что даёт набор.
 * 5. Начальные значения — здесь и только здесь, одинаково для всех адаптеров:
 *    свой инстанс получил пропсы конструктором, и второй раз они не пишутся
 *    (сеттер `items` фасада пересоздал бы элементы); внешнему `ctrl` пишутся
 *    сеттерами; участникам набора — если набор свой. Порядок: инстанс, плагины
 *    дескриптора, связка — а плагины снаружи получают своё, когда встают.
 * 6. Завершение набора: плагины реестра и объявление наружу на микрозадаче.
 *
 * Имя пропа одно во всех фреймворках, поэтому профиль адаптера сборке не нужен:
 * начальные значения идут в общем формате имён (`CommonProfile`).
 */

import { CommonProfile, PLUGIN_PROPS } from '../../naming'
import type { IComponentDescriptor, IPluginsContract } from '../../define'
import { TExchange } from '../exchange/exchange.class'
import { TMember } from '../exchange/member.class'
import { TSurface } from '../surface'
import { TAdapterContext } from './adapter-context.class'
import { TOwnBundle } from './own-bundle.class'
import { TSharedBundle } from './shared-bundle.class'
import type {
	IAdapterContext,
	IAdapterContextConfig,
	IAdapterContextOptions,
	IBundleTenancy,
	TContextContract,
} from './types'

/**
 * Пропсы связки, а не инстанса: `ctrl` и `embedded` читаются один раз при
 * сборке и в обмене не участвуют, `pluginProps` принимает связка
 * (`TExternalPlugins`). Это имена опций самого `createAdapterContext`.
 */
const MOUNT_PROPS: ReadonlySet<string> = new Set(['ctrl', 'embedded', PLUGIN_PROPS])

/** Не задан опцией — читается из пропсов: проп объявлен у всех компонентов, и помнить отдельный шаг не обязан ни один адаптер. */
function embeddedOf(options: IAdapterContextOptions): string | undefined {
	if (options.embedded !== undefined) return options.embedded

	const value: unknown = options.props ? Reflect.get(options.props, 'embedded') : undefined

	return typeof value === 'string' ? value : undefined
}

/**
 * Тип контекста выводится из дескриптора, дженерики адаптер не пишет.
 *
 * Инстанс сводится из двух источников — `ctor` дескриптора и `ctrl`. Адаптер
 * объявляет `ctrl` интерфейсом ядра (`IButton`), класс дескриптора
 * (`TButton`) его реализует, и контекст обещает интерфейс: под `ctrl` приходит
 * любая его реализация. `ctrl` чужого компонента не компилируется — класс
 * дескриптора его тип не реализует.
 */
export function createAdapterContext<TInstance extends object, TPlugins extends IPluginsContract>(
	descriptor: IComponentDescriptor<TContextContract<TInstance, TPlugins>>,
	options: IAdapterContextOptions<TInstance>,
	config: IAdapterContextConfig = {},
): IAdapterContext<TContextContract<TInstance, TPlugins>> {
	const props = options.props ?? {}
	const embedded = embeddedOf(options)

	// 1. Инстанс
	const instance = options.ctrl ?? new descriptor.ctor(props, options.options ?? {})

	// 2–3. Набор: компоненту без своих плагинов реестр набора не создаёт
	const tenancy: IBundleTenancy =
		config.bundle === undefined && descriptor.plugins.length > 0
			? new TOwnBundle(descriptor, instance, { embedded })
			: new TSharedBundle(descriptor, config.bundle ?? null)

	// 4. Участники
	const owner = new TMember(
		instance,
		descriptor.props.filter((spec) => !MOUNT_PROPS.has(spec.name.name)),
		descriptor.events,
	)
	const members = [owner, ...tenancy.members]

	// 5. Начальные значения
	const seeded = options.ctrl ? [owner, ...tenancy.seeded] : tenancy.seeded

	if (seeded.length > 0) {
		const { inputs } = new TExchange(seeded, TSurface.of(descriptor, CommonProfile), props)

		for (const member of seeded) inputs.seed(member.owner)
	}

	// 6. Плагины реестра и объявление набора
	tenancy.complete()

	return new TAdapterContext<TContextContract<TInstance, TPlugins>>(
		descriptor,
		instance,
		tenancy,
		members,
		props,
		embedded,
	)
}
