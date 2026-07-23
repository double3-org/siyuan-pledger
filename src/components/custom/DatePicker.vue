<template>
  <div class="pl-datepicker">
    <button class="pl-button" :popovertarget="popoverIdValue" :style="'anchor-name:--' + popoverIdValue">
      {{ modelValue || placeholder || '选择日期' }}
    </button>

    <div popover :id="popoverIdValue" class="pl-datepicker-popover"
      :class="{ 'pl-datepicker-popover-top': placement === 'top' }" :style="'position-anchor:--' + popoverIdValue">
      <calendar-date
        class="pl-datepicker-cally"
        :value="calendarValue"
        :focused-date="calendarValue"
        :today="today"
        locale="zh-CN"
        first-day-of-week="1"
        show-outside-days
        @change="datePicker"
      >
        <svg slot="previous">
          <use xlink:href="#iconLeft"></use>
        </svg>
        <svg slot="next">
          <use xlink:href="#iconRight"></use>
        </svg>
        <div slot="heading" class="pl-datepicker-heading">
          <calendar-select-year max-years="30"></calendar-select-year>
          <calendar-select-month format-month="long"></calendar-select-month>
        </div>
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

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = formatDate(new Date())
const calendarValue = computed(() => props.modelValue || today)
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

  &::part(header) {
    align-items: center;
    gap: 0.5rem;
  }

  &::part(heading) {
    flex: 1;
  }

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

.pl-datepicker-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  color: var(--pl-color-text);
  font-weight: 600;
}

calendar-select-year,
calendar-select-month {
  color: var(--pl-color-text);
  font-size: 1rem;

  &::part(select) {
    border: 0;
    border-radius: 0.25rem;
    padding: 0.2rem;
    color: inherit;
    background: var(--pl-color-background);
    font: inherit;
    font-weight: inherit;
    cursor: pointer;
  }

  &::part(label) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
}

calendar-month {
  &::part(today) {
    outline: 2px solid var(--pl-color-primary, #3b82f6);
    outline-offset: -3px;
  }

  &::part(selected) {
    background: var(--pl-color-primary, #3b82f6);
    color: var(--pl-color-text-on-primary, #fff);
  }

  &::part(outside) {
    color: var(--pl-color-text-secondary);
    opacity: 0.45;
  }

  &::part(day-0),
  &::part(day-6) {
    color: var(--pl-color-danger, #d14343);
  }

  &::part(button) {
    border-radius: 0.25rem;
  }

  &::part(selected) {
    color: var(--pl-color-text-on-primary, #fff);
  }
}
</style>
