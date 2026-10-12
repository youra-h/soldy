import ButtonSlotIcons from './ButtonSlotIcons.svelte'
import ButtonSlotLabels from './ButtonSlotLabels.svelte'
import LabelCheckBox from './LabelCheckBox.svelte'
import LabelRadio from './LabelRadio.svelte'
import LabelSwitch from './LabelSwitch.svelte'
import type { TPreview } from './previews'

/**
 * Разметка сценариев, которой нет у превью: содержимое слотов под проверку —
 * в Svelte.
 *
 * Ключи и разметка — те же, что у хостов Vue и React: сценарии в общем пакете
 * ищут в сцене одно и то же, на каком бы фреймворке её ни нарисовали. Слот по
 * умолчанию в Svelte — сниппет `children`, остальные слоты — сниппеты с теми же
 * именами.
 */
export const FIXTURES: Record<string, TPreview> = {
	'button-slot-labels': ButtonSlotLabels,
	'button-slot-icons': ButtonSlotIcons,
	'label-check-box': LabelCheckBox,
	'label-switch': LabelSwitch,
	'label-radio': LabelRadio,
}
