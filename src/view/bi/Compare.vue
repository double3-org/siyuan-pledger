<template>
  <div class="h-22 grid grid-cols-2 gap-4 items-start">
    <div>
      <div class="stat-desc mt-3 mb-2">较上期(元)</div>
      <div>
        <div :class="(amountDiff >= 0 ? 'text-lime-500' : 'text-red-700') + ' text-2xl'">
          <span>{{ amountDiff >= 0 ? '+' : '' }}</span>
          {{ amountDiff.toFixed(2) }}
        </div>
      </div>
    </div>
    <div>
      <div class="stat-desc mt-3 mb-2">较上期(率)</div>
      <div>
        <div :class="(rateDiff >= 0 ? 'text-lime-500' : 'text-red-700') + ' text-2xl'">
          <span>{{ rateDiff >= 0 ? '+' : '' }}</span>
          {{ rateDiff.toFixed(2) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  amountDiff: number;
  rateDiff: number;
  date: string;
}>();

</script>
