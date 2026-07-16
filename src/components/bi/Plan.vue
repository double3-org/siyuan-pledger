<template>
  <div class="pl-plan-main">
    <div class="pl-plan-block" v-for="i in blockNm" :key="i" :class="{ active: i <= activeBlockCount }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  blockNm: number
  value: number
}

const props = defineProps<Props>()

const activeBlockCount = computed(() => {
  const safeValue = Number.isFinite(props.value) ? props.value : 0;
  const rate = Math.min(Math.max(safeValue, 0), 1);
  return Math.floor(rate * props.blockNm);
})
</script>

<style scoped lang="css">
.active {
  background-color: var(--pl-color-primary);
}

.pl-plan-main {
  display: grid;
  gap: 0.25rem 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(0.45rem, 1fr));
  margin-top: 0.5rem;
}

.pl-plan-block {
  width: 0.65rem;
  height: 0.65rem;
  border: 1px solid var(--pl-color-border);
  border-radius: 0.25rem;
}
</style>
