import type { IEntity } from '../entity'
import { TEvented } from '../../../common'

/**
 * События невизуального компонента.
 *
 * Видимость (show/hide, change:visible/rendered/present) живёт в TComponentView:
 * TComponent — база для всего, включая то, что не рендерится (TDragAndDrop,
 * фасады коллекций).
 */
export type TComponentEvents = Record<string, (...args: any) => any>

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
	TEvents extends Record<string, (...args: any) => any> = TComponentEvents,
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
