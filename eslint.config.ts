import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

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

	{
		name: 'soldy/ui-component-names',
		files: ['packages/ui/**/*.vue'],
		rules: {
			'vue/multi-word-component-names': 'off',
			'vue/no-reserved-component-names': 'off',
		},
	},
	skipFormatting,
)
