<template>
  <div data-theme="emerald" class="bg-transparent">
    <button class="btn btn-sm" :popovertarget="popoverIdValue" :style="'anchor-name:--' + popoverIdValue">
      {{ modelValue || placeholder || '选择日期' }}
    </button>

    <div popover :id="popoverIdValue" class="dropdown bg-base-100 rounded-box shadow-lg "
      :style="'position-anchor:--' + popoverIdValue">
      <calendar-date class="cally" @change="datePicker">
        <svg slot="previous" class="fill-current size-4">
          <use xlink:href="#iconLeft"></use>
        </svg>
        <svg slot="next" class="fill-current size-4">
          <use xlink:href="#iconRight"></use>
        </svg>
        <calendar-month></calendar-month>
      </calendar-date>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function datePicker(event: Event) {
  const target = event.target as HTMLInputElement;
  document.getElementById(popoverIdValue.value)?.hidePopover();
  emit('update:modelValue', target.value)
}

const popoverId = 'datepicker-popover-' + Math.random().toString(36).substring(2, 11)
const popoverIdValue = computed(() => popoverId)
</script>