// Создаем наш собственный брендированный тип для ядра
export type TPropType<T> = {
	readonly __type: T
	readonly ctor: any // Ссылка на JS-конструктор (Object, Array, String и т.д.)
}
