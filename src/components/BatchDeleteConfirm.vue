<template>
  <div class="pl-batch-delete-confirm">
    <div class="pl-batch-delete-warning">
      <strong>确定删除所选的 {{ items.length }} 个记账块吗？</strong>
      <span>该操作会删除块及其 custom-pledge 属性，无法通过数据维护恢复。</span>
    </div>

    <div class="pl-batch-delete-list">
      <div v-for="item in items" :key="item.blockId">
        <code>{{ item.blockId }}</code>
        <span :title="formatLocation(item)">{{ formatLocation(item) }}</span>
      </div>
    </div>

    <div class="pl-batch-delete-footer">
      <span>建议删除前先导出全部数据备份。</span>
      <button class="pl-button" :disabled="submitting" @click="onClose">取消</button>
      <button class="pl-button pl-batch-delete-danger" :disabled="submitting" @click="confirmDelete">
        {{ submitting ? "删除中…" : `确认删除 ${items.length} 条` }}
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

async function confirmDelete() {
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
.pl-batch-delete-confirm {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--pl-color-text);
  background: var(--pl-color-background);
}

.pl-batch-delete-warning {
  display: grid;
  gap: 0.25rem;
}

.pl-batch-delete-warning strong {
  color: var(--pl-color-error);
}

.pl-batch-delete-warning span,
.pl-batch-delete-footer span {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
}

.pl-batch-delete-list {
  max-height: 20rem;
  overflow: auto;
  border: 1px solid var(--pl-color-border);
}

.pl-batch-delete-list div {
  display: grid;
  grid-template-columns: 13rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--pl-color-border);
  font-size: 0.75rem;
}

.pl-batch-delete-list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-batch-delete-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.pl-batch-delete-footer span {
  margin-right: auto;
  align-self: center;
}

.pl-batch-delete-danger {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-error);
  border-color: var(--pl-color-error);
}
</style>
