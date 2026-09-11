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

export type TComponentStates = Record<string, any>

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
