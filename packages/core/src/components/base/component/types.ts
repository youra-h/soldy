import type { IEntity } from '../entity'
import { TEvented } from '../../../common'
import type { TAnyEvents } from '../../../common'

/**
 * События невизуального компонента.
 *
 * Видимость (show/hide, change:visible/rendered/present) живёт в TComponentView:
 * TComponent — база для всего, включая то, что не рендерится (TDragAndDrop,
 * фасады коллекций).
 *
 * Карта закрыта: индексной сигнатуры нет, и имя, которого в ней нет, не
 * компилируется ни в `on`, ни в `emit`, ни в правиле `relay`. Открытый вид —
 * `TAnyEvents` — только констрейнт интерфейсов (`IComponent`), а не карта. У
 * класса иерархии `TComponent` констрейнт — его собственная закрытая карта (см.
 * `TComponent`). Карты компонентов и фасадов начинаются с этой и закрыты тоже.
 *
 * **`bundle:create` объявлен здесь, хотя плагины — слой над ядром.** Его шлёт
 * setup (`assembleBundle`) на шину инстанса: это единственный канал, видимый обеим
 * поверхностям управления — подписке с инстанса (`ctrl.events.on`) и пропу
 * событий адаптера (`@bundle:create`, `onBundleCreate`), который выводится из
 * этой же карты. Без имени в карте закрытая карта отвергла бы обе подписки.
 *
 * **Тип бандла ядро не знает** и не объявляет: `@soldy/plugins` оно не
 * импортирует. Поэтому аргумент `unknown`, а подписчик сужает его сам
 * (`bundle instanceof TPluginBundle`).
 *
 * **`plugin:event` — по той же причине.** Событие плагина, поставленного
 * снаружи (`usePlugins` или `bundle.use` в `bundle:create`), наружу компонента
 * не объявлено — дескриптор этого плагина не знает. Setup пересылает такие
 * события одним конвертом на шину инстанса: `@plugin:event`,
 * `onPluginEvent`, `(pluginEvent)` — одинаково во всех адаптерах.
 */
export type TComponentEvents = {
	/** Плагины компонента созданы при монтировании; аргумент — их bundle. */
	'bundle:create': (bundle: unknown) => void
	/** Событие внешнего плагина: полное имя (`timer:tick`) и аргументы. */
	'plugin:event': (event: TPluginEvent) => void
}

/** Конверт события внешнего плагина. */
export type TPluginEvent = {
	/** Полное имя события плагина: `timer:tick`. */
	readonly name: string
	readonly args: readonly unknown[]
}

// Корень иерархии пропсов: пустой намеренно — от него наследуются типы
// пропсов всех компонентов, и собственных полей у него быть не должно.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IComponentProps {}

/**
 * Тип `static defaultValues` класса ядра.
 *
 * - `TDefaulted` — пропы с настоящим умолчанием. Ключ обязателен, `undefined`
 *   из типа снят, и конструктор читает `ctor.defaultValues.x` без `!`.
 * - `TUndefined` — пропы, объявленные со значением `undefined` (`closable` у
 *   элемента наследуется от владельца). Ключ обязателен и здесь: значим сам
 *   ключ, а не значение (см. AGENTS.md, «Умолчание пропа — в декларации»).
 *
 * Класс пересекает его с умолчаниями родителя —
 * `typeof TParent.defaultValues & TDefaultValues<IXProps, 'a' | 'b'>`, — иначе
 * статическая сторона наследника несовместима с базой. В списках — только
 * свои ключи класса: переопределённое значение родительского ключа тип уже
 * покрывает. Списки сверяет компилятор: забытый в литерале ключ и ключ
 * литерала, которого нет ни в списке, ни у родителя, — ошибки.
 *
 * `Partial<IXProps>` здесь не годится: он делает объявленные ключи
 * необязательными, и каждое чтение умолчания получает `| undefined`.
 *
 * `& string` во второй части не лишний. `{ [K in TUndefined]: … }` с
 * параметром, ограниченным `keyof TProps`, TS считает гомоморфным и копирует
 * `?` из интерфейса пропов — ключ снова можно забыть. А `-?` вместо этого
 * снял бы и `undefined`, ради которого ключ объявлен.
 */
export type TDefaultValues<
	TProps,
	TDefaulted extends keyof TProps = never,
	TUndefined extends keyof TProps = never,
> = Required<Pick<TProps, TDefaulted>> & { [K in TUndefined & string]: TProps[K] | undefined }

export type TComponentStates = Record<string, unknown>

export interface IComponent<
	TProps extends IComponentProps = IComponentProps,
	TEvents extends TAnyEvents = TComponentEvents,
	TStates extends TComponentStates = TComponentStates,
> extends IEntity<TProps> {
	readonly events: TEvented<TEvents>
	readonly states: TStates
}

/**
 * Внутренние настройки компонента (второй аргумент конструктора).
 * states — инъекция state-реализаций.
 */
export interface IComponentOptions<TStates = any> {
	/**
	 * Инъекция state-реализаций.
	 * Нужна, чтобы менять поведение state свойств без оверрайда геттеров/сеттеров.
	 */
	states?: Partial<TStates>
}
