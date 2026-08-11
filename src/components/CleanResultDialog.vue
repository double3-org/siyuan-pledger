<template>
  <div class="pl-clean-result">
    <div class="pl-clean-result-summary">
      <span class="is-success">成功 <strong>{{ result.success }}</strong></span>
      <span>跳过 <strong>{{ result.skipped }}</strong></span>
      <span :class="{ 'is-failed': result.failed }">失败 <strong>{{ result.failed }}</strong></span>
    </div>

    <div class="pl-clean-result-table-wrap">
      <table class="pl-clean-result-table">
        <thead>
          <tr>
            <th>状态</th>
            <th>Block ID</th>
            <th>处理结果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in result.details" :key="`${item.blockId}-${index}`">
            <td :class="`is-${item.status}`">{{ statusLabels[item.status] }}</td>
            <td :title="item.blockId"><code>{{ item.blockId }}</code></td>
            <td :title="item.reason">{{ item.reason }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pl-clean-result-footer">
      <button class="pl-button pl-clean-result-primary" @click="onClose">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CleanResult } from "@/services/dataMaintenanceService";

defineProps<{
  result: CleanResult;
  onClose: () => void;
}>();

const statusLabels = {
  success: "成功",
  skipped: "跳过",
  failed: "失败",
};
</script>

<style scoped>
.pl-clean-result {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--pl-color-text);
  background: var(--pl-color-background);
}

.pl-clean-result-summary {
  display: flex;
  gap: 1.25rem;
  font-size: 0.9rem;
}

.pl-clean-result-summary .is-success,
.pl-clean-result-table .is-success {
  color: var(--pl-color-primary);
}

.pl-clean-result-summary .is-failed,
.pl-clean-result-table .is-failed {
  color: var(--pl-color-error);
}

.pl-clean-result-table-wrap {
  max-height: 22rem;
  overflow: auto;
  border: 1px solid var(--pl-color-border);
}

.pl-clean-result-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pl-clean-result-table th,
.pl-clean-result-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--pl-color-border);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.pl-clean-result-table th {
  position: sticky;
  top: 0;
  background: var(--pl-color-surface-light);
}

.pl-clean-result-table th:nth-child(1) { width: 14%; }
.pl-clean-result-table th:nth-child(2) { width: 34%; }
.pl-clean-result-table th:nth-child(3) { width: 52%; }

.pl-clean-result-table .is-skipped {
  color: var(--pl-color-text-secondary);
}

.pl-clean-result-footer {
  display: flex;
  justify-content: flex-end;
}

.pl-clean-result-primary {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}
</style>
