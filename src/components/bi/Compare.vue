<template>
  <div class="h-22 grid grid-cols-2 gap-4 items-start">
    <div>
      <div class="stat-desc mt-3 mb-2">较上期(元)</div>
      <div>
        <div :class="(amountDiff >= 0 ? 'text-lime-600' : 'text-red-700') + ' text-2xl'">
          {{ amountDiff.toFixed(2) }}
        </div>
      </div>
    </div>
    <div>
      <div class="stat-desc mt-3 mb-2">较上期(率)</div>
      <div>
        <div :class="(rateDiff >= 0 ? 'text-lime-600' : 'text-red-700') + ' text-2xl'">
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
