<template>
  <svg v-if="isSvgIcon" aria-hidden="true">
    <use :xlink:href="`#${displayIcon}`"></use>
  </svg>
  <span v-else class="pl-icon-text">{{ displayIcon }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  icon?: string,
  fallback?: string
}>();

const displayIcon = computed(() => {
  const icon = props.icon?.trim();
  return icon || props.fallback || "";
});

const isSvgIcon = computed(() => displayIcon.value.startsWith("icon"));
</script>

<style scoped lang="css">
.pl-icon-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
