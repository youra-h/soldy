import type { TPreview } from './previews'

/**
 * Разметка сценариев, которой нет у превью: содержимое слотов под проверку —
 * в Web Components.
 *
 * Ключи и разметка — те же, что у хоста Vue (`hosts/vue/fixtures.ts`):
 * сценарии в общем пакете ищут в сцене одно и то же, на каком бы фреймворке её
 * ни нарисовали. Фикстура — описание элемента, как у превью, а содержимое
 * слотов — его дети по слотам: свет элемента, который код хоста ставит до
 * вставки.
 *
 * Меток слотов Button (`button-slot-labels`) здесь нет: метка слота по
 * умолчанию печатает `text` из scope, а у слотов элемента scope нет
 * (`slotScope: false`).
 */
export const FIXTURES: Record<string, TPreview> = {
	// Иконки по краям — подпись длинная, из пропа `text` сценария
	'button-slot-icons': {
		tag: 'button',
		is: 'so-button',
		slots: {
			leading: [{ tag: 'span', is: 'so-icon', attributes: { icon: 'check' } }],
			trailing: [{ tag: 'span', is: 'so-icon', attributes: { icon: 'arrowRight' } }],
		},
	},
}
