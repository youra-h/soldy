import type { TPropType } from './types'

// Хелпер-функция для создания типа в contributions
export function defineType<T>(ctor: any): TPropType<T> {
	return { ctor } as unknown as TPropType<T>
}
