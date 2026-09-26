import type { IComponentDescriptor, IPluginDefinition } from '@soldy-ui/setup'

/** Чем редактировать проп. Выводится из метаданных, руками не задаётся. */
export type TControlKind = 'switch' | 'text' | 'number' | 'select'

/**
 * Где проп живёт у плагина.
 *
 * Имя здесь своё, без неймспейса: в разметке проп называется
 * `anchor_placement`, а свойство самого `TAnchorPlugin` — `placement`.
 */
export type TPluginPropAddress = {
	/** Ключ плагина в bundle: `bundle.get(ctor)`. */
	ctor: IPluginDefinition['ctor']
	/** Свойство на плагине — имя пропа из декларации. */
	name: string
}

/**
 * Кому проп принадлежит.
 *
 * Пропом его задают одинаково — Vue-компонент склеивает все наборы. А вот
 * через экземпляр по-разному: свойство компонента пишется в сам инстанс,
 * свойство коллекции — в фасад, который стенд строит поверх своего движка,
 * свойство плагина — в плагин из bundle, который адаптер отдаёт событием
 * `bundle:create`. Поэтому адрес плагина есть только у плагинной строки.
 */
export type TPropOwner =
	| { scope: 'component' }
	| { scope: 'collection' }
	| { scope: 'plugin'; plugin: TPluginPropAddress }

export type TPropControl = TPropOwner & {
	/**
	 * Имя, которым проп пишут в разметке (`underscorePropNaming`). У пропа
	 * плагина оно с неймспейсом — `anchor_placement`, у остальных совпадает с
	 * именем из декларации.
	 */
	name: string
	kind: TControlKind
	/** Значения для `select`; у остальных пусто. */
	options?: readonly string[]
	description: string
	/**
	 * Значение по умолчанию из описания пропа (`TPropSpec.default`).
	 *
	 * Значим ключ, а не значение: объявленное умолчание бывает и `undefined`
	 * (`closable` у элемента Tabs и Tags). Ключа нет — умолчания у пропа нет.
	 */
	default?: unknown
	/**
	 * Соседние пропы, без которых этот не виден (`removeOnBackspace` требует
	 * `editable` и `multiple`). Превью строки получает их вместе с самим пропом.
	 */
	preset?: Record<string, unknown>
}

/**
 * Строки страницы компонента, разведённые по владельцу пропа:
 * `componentControls`, `collectionControls`, `pluginControls`.
 *
 * Группы, а не один список: так устроена сама библиотека, и через экземпляр
 * проп каждого владельца пишется по-своему (см. `TPropOwner`). Ключи выведены
 * из `scope`, чтобы новый владелец не остался без группы; суффикс — потому что
 * поля с голым именем `collection` в проекте нет (AGENTS.md, «Переменная —
 * `engine`, а не `collection`»).
 */
export type TPropControlGroups = {
	[TScope in TPropOwner['scope'] as `${TScope}Controls`]: TPropControl[]
}

export type TComponentEntry = {
	/** Ключ в маршруте: `/component/button`. */
	id: string
	/** Подпись в меню и заголовке. */
	label: string
	/** Фабрика дескриптора — источник пропов, событий и слотов. */
	descriptor: () => IComponentDescriptor
	/**
	 * Дескриптор фасада коллекции — у кого она есть.
	 *
	 * Отдельный, а не слитый с компонентным, потому что так устроена сама
	 * библиотека: ядро отвечает за свойства компонента и не отвечает за
	 * свойства коллекции. `mode` живёт на фасаде, и Vue-компонент склеивает
	 * два дескриптора в один набор пропов — стенд делает то же самое.
	 */
	collectionDescriptor?: () => IComponentDescriptor
	/**
	 * Показывать ли на витрине. Слои вроде `Control` или `Stylable` компонентами
	 * не являются — у них есть страница, но выставлять их незачем.
	 */
	showcase: boolean
	/** Ширина ячейки витрины в колонках сетки. */
	span: 1 | 2
	/** Короткая строка под заголовком страницы. */
	description: string
}

export type TThemeEntry = {
	id: string
	label: string
	/** Значение `data-theme` для светлой схемы; тёмная — `${value}-dark`. */
	value: string
}

export type TIconPackEntry = {
	id: string
	label: string
}
