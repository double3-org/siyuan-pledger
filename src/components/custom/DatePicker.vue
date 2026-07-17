<template>
  <div class="pl-datepicker">
    <button class="pl-button" :popovertarget="popoverIdValue" :style="'anchor-name:--' + popoverIdValue">
      {{ modelValue || placeholder || '选择日期' }}
    </button>

    <div popover :id="popoverIdValue" class="pl-datepicker-popover"
      :class="{ 'pl-datepicker-popover-top': placement === 'top' }" :style="'position-anchor:--' + popoverIdValue">
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
  placement?: "top" | "bottom";
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
const placement = computed(() => props.placement || "bottom")
</script>

<style scoped lang="css">
.pl-datepicker {
  display: inline-block;
}

.pl-datepicker-popover {
  color: var(--pl-color-text);
  background-color: var(--pl-color-background);
  border-radius: 0.5rem;
  box-shadow: var(--pl-shadow);
  border: 1px solid var(--pl-color-border);
  padding: 0.75rem;
  top: anchor(bottom);
  left: anchor(left);
  margin: 0;
  margin-top: 0.5rem;
}

.pl-datepicker-popover-top {
  top: auto;
  bottom: anchor(top);
  margin-top: 0;
  margin-bottom: 0.5rem;
}

calendar-date {
  margin: auto;
  color: var(--pl-color-text);

  svg {
    width: 1rem;
    height: 1rem;
    fill: var(--pl-color-text-secondary);
  }

  &::part(button) {
    border: 0;
    color: var(--pl-color-text);
    background-color: var(--pl-color-background);
    border-radius: 3px;
  }
}

calendar-month {
  &::part(button) {
    border-radius: 0.25rem;
  }
}
</style>
