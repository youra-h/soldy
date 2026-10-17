import type { IMenuCollectionCheckboxItemProps } from '../collection/types'
import type { IMenuItem, IMenuItemProps } from '../item/types'

/**
 * Пропсы флажка меню: пропсы пункта и отметка — выбор коллекции меню
 * (`selected`), а не своё состояние флажка.
 */
export interface IMenuCheckboxItemProps extends IMenuItemProps, IMenuCollectionCheckboxItemProps {}

/** Флажок меню (`Menu.CheckboxItem`): пункт, который отмечается. */
export interface IMenuCheckboxItem extends IMenuItem<IMenuCheckboxItemProps> {}
