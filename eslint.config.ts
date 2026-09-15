import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import soldy from './tools/eslint/plugin'

export default defineConfigWithVueTs(
	{
		name: 'app/files-to-lint',
		files: ['**/*.{ts,mts,tsx,vue}'],
	},

	globalIgnores([
		'**/dist/**',
		'**/dist-ssr/**',
		'**/coverage/**',
		'**/lib/**',
		'**/.angular/**',
	]),

	pluginVue.configs['flat/essential'],
	vueTsConfigs.recommended,

	// Библиотека компонентов: Button, Select, Input — это имена продукта.
	// Оба правила рассчитаны на прикладной код, где односложное имя рискует
	// столкнуться с будущим HTML-элементом и потому просит префикс. В SFC
	// библиотеки компоненты импортируются явно, компилятор резолвит локальный
	// биндинг, и коллизии с нативными тегами не возникает.
	// Подчёркивание — принятая в проекте пометка «связывание нужно, значение
	// нет»: пустые хуки для наследников (onEngineBound(_engine)), сигнатуры,
	// которые держит контракт базового класса, и отбрасывание ключей при
	// деструктуризации ({ class: _, style: __, ...rest }). Правило про это не
	// знало и требовало удалить то, что удалять нельзя.
	{
		name: 'soldy/unused-underscore',
		rules: {
			// `interface ISwitchProps extends IInputControlProps<boolean> {}` —
			// не пустышка, а именованная точка расширения: у компонента есть свой
			// публичный тип пропсов, на который ссылаются адаптеры и в который
			// добавляют поля, когда они появляются. Замена на алиас отняла бы
			// и слияние деклараций, и понятное имя в ошибках типов.
			'@typescript-eslint/no-empty-object-type': [
				'error',
				{ allowInterfaces: 'with-single-extends' },
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
				},
			],
		},
	},

	// `any` пропускается только там, где он стирает инвариантность, а не прячет
	// тип. Встроенное правило этих позиций не различает (см. AGENTS.md,
	// «`any`: где он честный»).
	{
		name: 'soldy/no-explicit-any',
		files: ['**/*.{ts,mts,tsx,vue}'],
		plugins: { soldy },
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'soldy/no-explicit-any': 'error',
		},
	},

	// Приведения, которые прячут несовпавший контракт, запрещены целиком
	// (см. AGENTS.md, «Никаких костылей»). `as any` ловит soldy/no-explicit-any,
	// `@ts-ignore`/`@ts-nocheck` — ban-ts-comment из recommended. Что блок
	// действительно включён на путях пакетов, проверяет tools/eslint/__tests__.
	{
		name: 'soldy/no-casts',
		files: ['**/*.{ts,mts,tsx,vue}'],
		// Временно, до 869f2grdv
		ignores: ['packages/plugins/**'],
		rules: {
			'@typescript-eslint/consistent-type-assertions': [
				'error',
				{ assertionStyle: 'as', objectLiteralTypeAssertions: 'allow' },
			],
			'no-restricted-syntax': [
				'error',
				{
					selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
					message:
						'`as never` прячет несовпавший контракт — почините тип (AGENTS.md, «Никаких костылей»).',
				},
				{
					selector:
						"TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
					message:
						'`as unknown as X` прячет несовпавший контракт — почините тип (AGENTS.md, «Никаких костылей»).',
				},
				{
					selector: "TSAsExpression[typeAnnotation.typeName.name='TEvented']",
					message:
						'`as TEvented<…>` — свои события класс шлёт через TEventSink (AGENTS.md, «События item-адаптера»).',
				},
			],
		},
	},

	// В тестах ядра `any` запрещён в любой позиции: инвариантных карт событий в
	// констрейнтах там нет, а любой `any` глушит проверку, ради которой тест.
	{
		name: 'soldy/core-tests-no-any',
		files: ['packages/core/__tests__/**/*.ts'],
		rules: {
			'soldy/no-explicit-any': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
		},
	},

	{
		name: 'soldy/ui-component-names',
		files: ['packages/ui/**/*.vue'],
		rules: {
			'vue/multi-word-component-names': 'off',
			'vue/no-reserved-component-names': 'off',
		},
	},

	// Компоненты Vue — только проводка того, что отдал адаптер (AGENTS.md,
	// «Механизмы фреймворка — только в адаптерном слое»). `'vue'` тут не
	// импортируют вовсе — реактивность и `toRaw` живут в `src/adapter/**`.
	// Второй запрет ловит именно ту забытую проводку, из-за которой заведена
	// задача 869f1qdxd: `createAdapterContext` напрямую пропускает снятие
	// прокси с `ctrl`/`engine`, которое делает `createVueAdapterContext`.
	{
		name: 'soldy/vue-components-no-framework',
		files: ['packages/ui/vue/src/components/**/*.{ts,vue}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'vue',
							message:
								'Механизмы Vue — только в src/adapter/** (AGENTS.md, «Механизмы фреймворка — только в адаптерном слое»).',
						},
						{
							name: '@soldy/setup',
							importNames: ['createAdapterContext'],
							message:
								'Используйте createVueAdapterContext из src/adapter/common — он снимает Vue-прокси с ctrl/engine.',
						},
					],
				},
			],
		},
	},
	// Компоненты React — только проводка того, что отдал адаптер (AGENTS.md,
	// «Механизмы фреймворка — только в адаптерном слое»). Значения из 'react'
	// запрещены (это ловит и `import * as React` → `React.useRef`), но типы
	// (`ElementType`, `ReactElement`) компонентам нужны — `allowTypeImports`
	// пропускает `import type { ... } from 'react'`. Отсюда
	// `@typescript-eslint/no-restricted-imports`, а не базовое `no-restricted-imports`:
	// только у него есть эта опция.
	{
		name: 'soldy/react-components-no-framework',
		files: ['packages/ui/react/src/components/**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'react',
							allowTypeImports: true,
							message:
								'Механизмы React — только в src/adapter/** (AGENTS.md, «Механизмы фреймворка — только в адаптерном слое»).',
						},
					],
				},
			],
		},
	},
	skipFormatting,
)
