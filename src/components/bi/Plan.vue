<template>
  <div class="pl-plan-main">
    <div class="pl-plan-block" v-for="i in blockNm" :key="i" :class="{ active: i <= value * 100 }"></div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  blockNm: number
  value: number
}

const props = defineProps<Props>()
</script>

<style scoped lang="css">
.active {
  background-color: oklch(70.7% 0.022 261.325)
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
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}
</style>
