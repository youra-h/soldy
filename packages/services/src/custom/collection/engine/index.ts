// collection/index.ts — главный экспорт модуля

// Типы
export type { TEngineEvents } from './types'

// Хранилище
export type { IStorage } from './storage'
export { TArrayStorage } from './storage'

// Команды
export type { ICommand } from './command'
export { TInsertCommand, TRemoveCommand, TUpdateCommand, TMoveCommand, TClearCommand } from './command'

// Расширения
export type { IExtension, IExtensionContext } from './extension'
export { TPlainExtension, TBatchExtension, TSelectionExtension } from './extension'

// Ядро
export { TCollectionEngine } from './collection-engine'
export type { ICollectionEngine } from './collection-engine'

// Фасад
export { TCollection } from './collection.class'
