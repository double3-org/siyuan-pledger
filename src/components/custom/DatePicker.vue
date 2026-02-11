<template>
  <div class="pl-datepicker">
    <button class="pl-button" :popovertarget="popoverIdValue" :style="'anchor-name:--' + popoverIdValue">
      {{ modelValue || placeholder || '选择日期' }}
    </button>

    <div popover :id="popoverIdValue" class="pl-datepicker-popover" :style="'position-anchor:--' + popoverIdValue">
      <calendar-date class="pl-datepicker-cally" @change="datePicker">
        <svg slot="previous">
          <use xlink:href="#iconLeft"></use>
        </svg>
        <svg slot="next">
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

<style scoped lang="css">
.pl-datepicker {
  display: inline-block;
}

.pl-datepicker-popover {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  padding: 0.75rem;
  top: anchor(bottom);
  left: anchor(left);
  margin: 0;
  margin-top: 0.5rem;
}

calendar-date {
  margin: auto;

  svg {
    width: 1rem;
    height: 1rem;
    fill: #6b7280;
  }

  &::part(button) {
    border: 0;
    background-color: #fff;
    border-radius: 3px;
  }
}

calendar-month {
  &::part(button) {
    border-radius: 0.25rem;
  }
}
</style>
