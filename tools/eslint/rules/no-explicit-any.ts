import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'

/**
 * `soldy/no-explicit-any` — `any` только там, где он стирает инвариантность,
 * а не прячет тип (см. AGENTS.md, «`any`: где он честный»).
 *
 * Заменяет `@typescript-eslint/no-explicit-any`. Встроенное правило не
 * отличает задокументированный приём проекта — `any` в констрейнте дженерика
 * при инвариантной карте событий — от `any`, который просто отключает
 * проверку, а его `ignoreRestArgs` не видит `(...args: any)` без `[]`.
 *
 * Пропускается `any`:
 * 1. в констрейнте или дефолте параметра типа:
 *    `<TEvents extends Record<string, (...args: any) => any> = any>`;
 * 2. в `extends` условного типа: `T extends TComponent<any, any, infer S> ? S : …`;
 * 3. в rest-параметре конструкторного типа: `new (...args: any[]) => T` —
 *    миксины и `this` статических фабрик;
 * 4. прямым аргументом дженерика проекта, имя `T…`/`I…`:
 *    `TCollectionEngine<TItem, any>`, `TEvented<any>`. У `Record`, `Partial`,
 *    `Array`, `Map` и прочих типов стандартной библиотеки — нет;
 * 5. в универсальном типе функции `(...args: any) => any` — так «любую
 *    функцию» записывает и стандартная библиотека TS
 *    (`Parameters<T extends (...args: any) => any>`).
 *
 * Всё остальное — ошибка: `Record<string, any>`, `(item: T) => any`,
 * `value: any`, `as any`.
 */

/** Имя дженерика проекта: классы и типы `T…`, интерфейсы `I…`. */
const PROJECT_GENERIC = /^[TI][A-Z]/

/** 1 и 2: `any` лежит в констрейнте/дефолте параметра типа или в `extends` условного типа. */
function isInTypeBound(node: TSESTree.Node): boolean {
	let child: TSESTree.Node = node
	let parent = node.parent

	while (parent) {
		if (
			parent.type === AST_NODE_TYPES.TSTypeParameter &&
			(parent.constraint === child || parent.default === child)
		) {
			return true
		}

		if (parent.type === AST_NODE_TYPES.TSConditionalType && parent.extendsType === child) {
			return true
		}

		child = parent
		parent = parent.parent
	}

	return false
}

/** Rest-параметр, если `any` — его тип (`...args: any` или `...args: any[]`). */
function restParamOf(node: TSESTree.TSAnyKeyword): TSESTree.RestElement | null {
	let annotation: TSESTree.Node = node.parent

	if (annotation.type === AST_NODE_TYPES.TSArrayType) {
		annotation = annotation.parent
	}

	if (annotation.type !== AST_NODE_TYPES.TSTypeAnnotation) return null

	return annotation.parent.type === AST_NODE_TYPES.RestElement ? annotation.parent : null
}

function isAnyRest(param: TSESTree.Parameter): boolean {
	if (param.type !== AST_NODE_TYPES.RestElement) return false

	const type = param.typeAnnotation?.typeAnnotation

	return (
		type?.type === AST_NODE_TYPES.TSAnyKeyword ||
		(type?.type === AST_NODE_TYPES.TSArrayType &&
			type.elementType.type === AST_NODE_TYPES.TSAnyKeyword)
	)
}

/** `(...args: any) => any` / `(...args: any[]) => any` и ничего сверх. */
function isUniversalFunction(fn: TSESTree.TSFunctionType): boolean {
	return (
		fn.params.length === 1 &&
		isAnyRest(fn.params[0]) &&
		fn.returnType?.typeAnnotation.type === AST_NODE_TYPES.TSAnyKeyword
	)
}

/** 3 и 5: `any` в сигнатуре конструкторного типа или универсальной функции. */
function isInAllowedSignature(node: TSESTree.TSAnyKeyword): boolean {
	const rest = restParamOf(node)

	if (rest) {
		const fn = rest.parent

		if (fn.type === AST_NODE_TYPES.TSConstructorType) return true

		return fn.type === AST_NODE_TYPES.TSFunctionType && isUniversalFunction(fn)
	}

	const annotation = node.parent

	if (annotation.type !== AST_NODE_TYPES.TSTypeAnnotation) return false

	const fn = annotation.parent

	return (
		fn.type === AST_NODE_TYPES.TSFunctionType &&
		fn.returnType === annotation &&
		isUniversalFunction(fn)
	)
}

function entityName(name: TSESTree.EntityName): string | null {
	if (name.type === AST_NODE_TYPES.Identifier) return name.name
	if (name.type === AST_NODE_TYPES.TSQualifiedName) return name.right.name

	return null
}

function expressionName(expression: TSESTree.Expression): string | null {
	if (expression.type === AST_NODE_TYPES.Identifier) return expression.name

	if (
		expression.type === AST_NODE_TYPES.MemberExpression &&
		expression.property.type === AST_NODE_TYPES.Identifier
	) {
		return expression.property.name
	}

	return null
}

/** Имя дженерика, которому передан список аргументов типа. */
function genericNameOf(owner: TSESTree.Node): string | null {
	switch (owner.type) {
		case AST_NODE_TYPES.TSTypeReference:
			return entityName(owner.typeName)
		case AST_NODE_TYPES.NewExpression:
		case AST_NODE_TYPES.CallExpression:
			return expressionName(owner.callee)
		case AST_NODE_TYPES.TSInterfaceHeritage:
		case AST_NODE_TYPES.TSClassImplements:
			return expressionName(owner.expression)
		case AST_NODE_TYPES.ClassDeclaration:
		case AST_NODE_TYPES.ClassExpression:
			return owner.superClass ? expressionName(owner.superClass) : null
		default:
			return null
	}
}

/** 4: `any` — прямой аргумент дженерика проекта. */
function isProjectGenericArgument(node: TSESTree.TSAnyKeyword): boolean {
	const list = node.parent

	if (list.type !== AST_NODE_TYPES.TSTypeParameterInstantiation) return false

	const name = genericNameOf(list.parent)

	return name !== null && PROJECT_GENERIC.test(name)
}

export const noExplicitAny = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'suggestion',
		docs: {
			description: '`any` только в констрейнте, extends условного типа и аргументе дженерика проекта',
		},
		messages: {
			unexpectedAny:
				'`any` прячет тип. Укажите тип или `unknown`. `any` допустим только в констрейнте/дефолте параметра типа, в extends условного типа, в rest конструкторного типа, аргументом дженерика проекта и в `(...args: any) => any` (AGENTS.md, «`any`: где он честный»).',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			TSAnyKeyword(node) {
				if (isInTypeBound(node) || isInAllowedSignature(node) || isProjectGenericArgument(node)) {
					return
				}

				context.report({ node, messageId: 'unexpectedAny' })
			},
		}
	},
})
