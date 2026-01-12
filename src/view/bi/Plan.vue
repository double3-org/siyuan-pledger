<template>
  <div class="grid gap-1 grid-cols-25 mt-2">
    <div class="w-3 h-3 border border-gray-500 rounded-sm" v-for="i in blockNm" :key="i"
      :class="{ active: i <= value * 100 }"></div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  blockNm: number
  value: number
}

const props = defineProps<Props>()
</script>

<style scoped>
.active {
  background-color: oklch(70.7% 0.022 261.325)
}
</style>
