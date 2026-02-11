<template>
  <div class="pl-compare-main">
    <div>
      <div class="pl-compare-desc">较上期(元)</div>
      <div>
        <div :class="(amountDiff >= 0 ? 'lime-600' : 'red-700') + ' pl-compare-value'">
          {{ amountDiff.toFixed(2) }}
        </div>
      </div>
    </div>
    <div>
      <div class="pl-compare-desc">较上期(率)</div>
      <div>
        <div :class="(rateDiff >= 0 ? 'lime-600' : 'red-700') + ' pl-compare-value'">
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

<style scoped lang="css">
.pl-compare-main {
  /* h-22 grid grid-cols-2 gap-4 items-start */
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.pl-compare-desc {
  /* stat-desc mt-3 mb-2 */
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: #666;
}

.pl-compare-value {
  font-size: 1.5rem;
}

.pl-compare-value.lime-600 {
  color: #40c571;
}

.pl-compare-value.red-700 {
  color: #e23955;
}
</style>
