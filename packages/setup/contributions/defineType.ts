import type { TPropType } from './types'

// Хелпер-функция для создания типа в contributions
export function defineType<T>(ctor: unknown): TPropType<T> {
	return { ctor }
}
