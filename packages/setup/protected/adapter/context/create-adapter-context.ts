/**
 * createAdapterContext — сборка компонента на монтирование: шесть шагов, сверху вниз.
 *
 * 1. Инстанс — `ctrl` или конструктор дескриптора.
 * 2. Начальные значения инстансу. Свой инстанс получил пропсы конструктором, и
 *    второй раз они не пишутся (сеттер `items` фасада пересоздал бы
 *    элементы); внешнему `ctrl` они пишутся сеттерами — **до** набора, как и
 *    своему: плагины встают на уже настроенный инстанс и читают его при
 *    установке. На события его сеттеров плагинам рассчитывать нельзя —
 *    подписки на чужие шины начинаются с принятия набора.
 * 3–4. Набор плагинов: свой (`TOwnBundle`, с id монтирования `mountId`) или не
 *    свой (`TSharedBundle`).
 * 5. Участники обмена: инстанс, затем то, что даёт набор. Начальные значения
 *    участникам набора — если набор свой: плагинам дескриптора и связке.
 *    Плагины снаружи получают своё, когда встают.
 * 6. Плагины реестра. Принимает и объявляет набор `attach()` контекста, а не
 *    сборка: сборку, которую фреймворк не принял, никто не уничтожит.
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

/** Начальные значения участникам — из пропсов сборки, правилом линии (`TLine.seed`). */
function seed(members: readonly TMember[], descriptor: IComponentDescriptor, props: object): void {
	if (members.length === 0) return

	const { inputs } = new TExchange(members, TSurface.of(descriptor, CommonProfile), props)

	for (const member of members) inputs.seed(member.owner)
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
	const owner = new TMember(
		instance,
		descriptor.props.filter((spec) => !MOUNT_PROPS.has(spec.name.name)),
		descriptor.events,
	)

	// 2. Начальные значения инстансу — до набора
	if (options.ctrl) seed([owner], descriptor, props)

	// 3–4. Набор: компоненту без своих плагинов реестр набора не создаёт
	const tenancy: IBundleTenancy =
		config.bundle === undefined && descriptor.plugins.length > 0
			? new TOwnBundle(descriptor, instance, { embedded }, options.mountId)
			: new TSharedBundle(descriptor, config.bundle ?? null)

	// 5. Участники и начальные значения набору
	const members = [owner, ...tenancy.members]

	seed(tenancy.seeded, descriptor, props)

	// 6. Плагины реестра
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
