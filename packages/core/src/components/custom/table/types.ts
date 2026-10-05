import type { IControl, IControlProps, TControlEvents } from '../../base/control'
import type { ITableCollectionProps } from './collection/types'

export type TTableEvents = TControlEvents

/** Полный набор пропсов таблицы: свои и коллекции строк (engine, items, trackBy, mode, columns). */
export interface ITableProps extends IControlProps, ITableCollectionProps {}

export interface ITable extends IControl<ITableProps, TTableEvents> {}
