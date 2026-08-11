<template>
  <div class="pl-batch-clean-confirm">
    <div class="pl-batch-clean-summary">
      <strong>将清洗 {{ items.length }} 条数据</strong>
      <span>仅保留标准业务及定位字段，并删除 id、icon 等非标准属性。</span>
    </div>

    <div class="pl-batch-clean-table-wrap">
      <table class="pl-batch-clean-table">
        <thead>
          <tr>
            <th>Block ID</th>
            <th>文档位置</th>
            <th>修改字段</th>
            <th>异常原因</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.blockId">
            <td :title="item.blockId"><code>{{ item.blockId }}</code></td>
            <td :title="formatLocation(item)">{{ formatLocation(item) }}</td>
            <td class="pl-batch-clean-changes" :title="item.changes.join('、')">{{ item.changes.join("、") }}</td>
            <td :title="item.reasons.join('；')">{{ item.reasons.join("；") }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pl-batch-clean-footer">
      <span>仅更新 custom-pledge 属性。清洗前建议先导出全部数据备份。</span>
      <button class="pl-button" :disabled="submitting" @click="onClose">取消</button>
      <button class="pl-button pl-batch-clean-primary" :disabled="submitting" @click="confirmClean">
        {{ submitting ? "清洗中…" : `确认清洗 ${items.length} 条` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { PledgeScanItem } from "@/services/dataMaintenanceService";

const props = defineProps<{
  items: PledgeScanItem[];
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}>();

const submitting = ref(false);

async function confirmClean() {
  submitting.value = true;
  try {
    if (await props.onConfirm()) props.onClose();
  } finally {
    submitting.value = false;
  }
}

function formatLocation(item: PledgeScanItem): string {
  const notebook = item.notebookName || item.notebookId || "未知笔记本";
  const path = item.hPath || item.path || item.documentId || "无法读取路径";
  return `${notebook} ${path}`;
}
</script>

<style scoped>
.pl-batch-clean-confirm {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--pl-color-text);
  background: var(--pl-color-background);
}

.pl-batch-clean-summary {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.pl-batch-clean-summary span,
.pl-batch-clean-footer span {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
}

.pl-batch-clean-table-wrap {
  max-height: 24rem;
  overflow: auto;
  border: 1px solid var(--pl-color-border);
}

.pl-batch-clean-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pl-batch-clean-table th,
.pl-batch-clean-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--pl-color-border);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.pl-batch-clean-table th {
  position: sticky;
  top: 0;
  color: var(--pl-color-text);
  background: var(--pl-color-surface-light);
}

.pl-batch-clean-table th:nth-child(1) { width: 20%; }
.pl-batch-clean-table th:nth-child(2) { width: 28%; }
.pl-batch-clean-table th:nth-child(3) { width: 24%; }
.pl-batch-clean-table th:nth-child(4) { width: 28%; }

.pl-batch-clean-changes,
.pl-batch-clean-table td:last-child {
  color: var(--pl-color-error);
}

.pl-batch-clean-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.pl-batch-clean-footer span {
  margin-right: auto;
  align-self: center;
}

.pl-batch-clean-primary {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}
</style>
