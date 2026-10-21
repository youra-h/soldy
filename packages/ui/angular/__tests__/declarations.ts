/**
 * Объявления Angular из экспорта пакета — компоненты и директивы — для спеков,
 * которые проверяют их все сразу: селекторы, входы, выходы. Не ручным
 * списком: новое объявление попадёт под проверку само.
 *
 * Компонент Angular описывает публичное зеркало `reflectComponentType`. У
 * директивы публичного зеркала нет, и её описание берётся закрытым
 * `ɵgetDirectiveDef` — тем же, по которому TestBed ставит директиву на хост
 * (`createDirective`). Перестанет оно отдавать описание — упадёт проверка
 * «директивы найдены» в `selectors.spec.ts`, а директивы не выпадут из
 * проверок молча.
 */

import { reflectComponentType, ɵgetDirectiveDef, type Type } from '@angular/core'
import * as angular from '@soldy-ui/angular'
import { TComponentBase } from '@soldy-ui/angular'

/** Вход объявления — как его видит шаблон потребителя. */
export type TDeclaredInput = {
	/** Имя в шаблоне: `[text]`, `[ctrl]`. */
	readonly templateName: string
	/** Есть — вход с transform: у компонентов soldy это булев вход (`booleanInput`). */
	readonly transform?: (value: unknown) => unknown
}

export type TDeclaration = {
	/** Имя в экспорте пакета: под ним хост импортирует объявление. */
	readonly name: string
	readonly type: Type<unknown>
	/**
	 * Компонент Angular — со своим элементом и шаблоном — или директива. Компонент
	 * soldy без корня (`so-virtual`) — директива: её пишут на `<ng-container>`.
	 */
	readonly kind: 'component' | 'directive'
	/** Компонент soldy — наследник `TComponentBase`, а не директива адаптера (`so-attributes`). */
	readonly soldy: boolean
	/** Селектор, как в декораторе: части через запятую. */
	readonly selector: string
	/** Все входы — с `ctrl` базы у компонентов soldy. */
	readonly inputs: readonly TDeclaredInput[]
	/** Выходы — имена свойств экземпляра: под ними геттеры выходов. */
	readonly outputs: readonly string[]
}

/**
 * Класс из экспорта: описание бывает только у конструктора. Утилиты экспорта
 * (`useAdapter`, `setupButton`) для JS тоже функции с прототипом, но описания
 * за ними нет.
 */
function isConstructor(value: unknown): value is Type<unknown> {
	return typeof value === 'function' && typeof value.prototype === 'object'
}

/** Наследник `TComponentBase` — компонент soldy. */
function isSoldy(type: Type<unknown>): boolean {
	return type.prototype instanceof TComponentBase
}

/**
 * Селектор строкой из разобранного вида описания директивы: каждая часть —
 * тег (пустой — без тега) и пары «атрибут, значение»: `['', 'so-virtual', '']`
 * — `[so-virtual]`, `['svg', 'so-role-icon', '']` — `svg[so-role-icon]`. Флаги
 * `:not()` и классов в разборе — числа; у директив пакета их нет, и флаг —
 * ошибка спека, а не молча неверный селектор.
 */
function selectorText(selectors: readonly (readonly unknown[])[]): string {
	return selectors
		.map(([tag, ...attributes]) => {
			if (typeof tag !== 'string') throw new Error(`флаг в селекторе: ${String(tag)}`)

			const parts = [tag]

			for (let index = 0; index < attributes.length; index += 2) {
				const name = attributes[index]
				const value = attributes[index + 1]

				if (typeof name !== 'string' || typeof value !== 'string') {
					throw new Error(`флаг в селекторе ${tag}: ${String(name)}`)
				}

				parts.push(value === '' ? `[${name}]` : `[${name}=${value}]`)
			}

			return parts.join('')
		})
		.join(', ')
}

/** Описание класса: компонент — зеркалом, директива — своим описанием, иначе ничего. */
function declarationOf(name: string, type: Type<unknown>): TDeclaration | null {
	const mirror = reflectComponentType(type)

	if (mirror) {
		return {
			name,
			type,
			kind: 'component',
			soldy: isSoldy(type),
			selector: mirror.selector,
			inputs: mirror.inputs.map(({ templateName, transform }) => ({
				templateName,
				transform,
			})),
			outputs: mirror.outputs.map(({ propName }) => propName),
		}
	}

	const def = ɵgetDirectiveDef(type)

	// Описание бывает унаследовано: статику класса JS берёт и у предка. Своё —
	// только с селектором: у абстрактной базы (`T<Имя>Surface`) его нет
	if (def?.type !== type || def.selectors.length === 0) return null

	return {
		name,
		type,
		kind: 'directive',
		soldy: isSoldy(type),
		selector: selectorText(def.selectors),
		inputs: Object.entries(def.inputs).map(([templateName, [, , transform]]) => ({
			templateName,
			transform: transform ?? undefined,
		})),
		outputs: Object.keys(def.outputs),
	}
}

/** Компоненты и директивы экспорта пакета. */
export function exportedDeclarations(): TDeclaration[] {
	const entries: Record<string, unknown> = angular
	const result: TDeclaration[] = []

	for (const [name, value] of Object.entries(entries)) {
		const declaration = isConstructor(value) ? declarationOf(name, value) : null

		if (declaration) result.push(declaration)
	}

	return result
}
