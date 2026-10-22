import { AST_NODE_TYPES, ASTUtils, ESLintUtils, TSESLint } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'

/**
 * `soldy/solid-part-props` — атрибуты узла разметки компонента Solid идут
 * через помощник адаптера, а не спредом прямо из состояния
 * (`packages/ui/solid/src/adapter/common/root.ts`, шапка, «Гидратация»).
 *
 * Пока Solid гидратирует, в узлы он не пишет, а спред запоминает пропущенное
 * как записанное: набор, сменившийся за гидратацию, до узла уже не дойдёт.
 * Удерживают его мемо раскладки — корня (`createRootProps`,
 * `createWrappedRootProps`) и внутреннего узла (`createPartProps`). Атрибуты
 * текста поля (`fieldText`, `textareaText`) — `ref` поля в браузере и текст
 * на сервере: в узел текст пишет эффект `ref`, мимо памяти спреда.
 *
 * На нативном элементе (имя со строчной) и на `Dynamic` спред допустим только
 * в трёх формах — `x()`, `x().поле` и `x`, где `x` — `const` из вызова
 * помощника. Спред на компоненте (`<Button {...state.aria}>`) правило
 * пропускает: набор в узел кладёт раскладка корня того компонента.
 */

/** Помощники адаптера, чьи атрибуты спред получает готовыми. */
const HELPERS = new Set([
	'createRootProps',
	'createWrappedRootProps',
	'createPartProps',
	'fieldText',
	'textareaText',
])

/** Компонент, который спред кладёт на свой узел, как нативный элемент. */
const DYNAMIC = 'Dynamic'

/** Нативный элемент (`div`, `so-x`, `svg:rect`) или `Dynamic` — спред ложится на узел. */
function spreadsOnNode(name: TSESTree.JSXTagNameExpression): boolean {
	if (name.type === AST_NODE_TYPES.JSXNamespacedName) return true
	if (name.type !== AST_NODE_TYPES.JSXIdentifier) return false

	return name.name === DYNAMIC || /^[a-z]/.test(name.name)
}

/** `x` — `const` из вызова помощника: `const x = createPartProps(…)`. */
function isHelperConst(identifier: TSESTree.Identifier, scope: TSESLint.Scope.Scope): boolean {
	const variable = ASTUtils.findVariable(scope, identifier)

	return (
		variable?.defs.some((definition) => {
			if (definition.type !== TSESLint.Scope.DefinitionType.Variable) return false

			const declarator = definition.node
			const init = declarator.init

			return (
				definition.parent.kind === 'const' &&
				declarator.id.type === AST_NODE_TYPES.Identifier &&
				init?.type === AST_NODE_TYPES.CallExpression &&
				init.callee.type === AST_NODE_TYPES.Identifier &&
				HELPERS.has(init.callee.name)
			)
		}) ?? false
	)
}

/** `x()` без аргументов, где `x` — `const` из вызова помощника. */
function isHelperCall(expression: TSESTree.Expression, scope: TSESLint.Scope.Scope): boolean {
	return (
		expression.type === AST_NODE_TYPES.CallExpression &&
		expression.arguments.length === 0 &&
		expression.callee.type === AST_NODE_TYPES.Identifier &&
		isHelperConst(expression.callee, scope)
	)
}

/** Допустимые формы: `x()`, `x().поле` и `x`. */
function isHelperSpread(argument: TSESTree.Expression, scope: TSESLint.Scope.Scope): boolean {
	if (argument.type === AST_NODE_TYPES.Identifier) return isHelperConst(argument, scope)

	if (
		argument.type === AST_NODE_TYPES.MemberExpression &&
		!argument.computed &&
		argument.property.type === AST_NODE_TYPES.Identifier
	) {
		return isHelperCall(argument.object, scope)
	}

	return isHelperCall(argument, scope)
}

export const solidPartProps = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Спред на узле разметки компонента Solid — только атрибуты от помощника адаптера',
		},
		messages: {
			directSpread:
				'Спред на узле разметки — атрибуты от помощника адаптера: `{...x()}`, `{...x().поле}` или `{...x}`, где `x` — `const` из `createPartProps`, `createRootProps`, `createWrappedRootProps`, `fieldText` или `textareaText`. Набор прямо из состояния, сменившийся во время гидратации, до узла не дойдёт (packages/ui/solid/src/adapter/common/root.ts, шапка, «Гидратация»).',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			JSXSpreadAttribute(node) {
				const element = node.parent

				if (!spreadsOnNode(element.name)) return
				if (isHelperSpread(node.argument, context.sourceCode.getScope(node))) return

				context.report({ node, messageId: 'directSpread' })
			},
		}
	},
})
