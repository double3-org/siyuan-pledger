<template>
  <div class="pl-maintenance">
    <div class="pl-maintenance-header">
      <div class="pl-maintenance-heading">
        <div class="pl-maintenance-title-line">
          <h3>数据维护</h3>
          <span>扫描全部 custom-pledge 属性；清洗只更新属性，不修改正文或移动块。</span>
        </div>
        <div class="pl-maintenance-meta">
          <span>{{ storageModeText }}</span>
          <code>{{ settingConfData.bookkeepingDocumentId || "未配置存放位置" }}</code>
          <span v-if="scanResult">扫描于 {{ formatDateTime(scanResult.scannedAt) }}</span>
        </div>
      </div>
      <div class="pl-maintenance-actions">
        <button class="pl-button pl-maintenance-primary" :disabled="busy" @click="runScan">
          {{ scanning ? "扫描中…" : "扫描全部数据" }}
        </button>
        <button v-if="scanResult" class="pl-button" :disabled="busy" @click="exportData('managed')">导出当前</button>
        <button v-if="scanResult" class="pl-button" :disabled="busy" @click="exportData('all')">导出全部</button>
        <button v-if="scanResult" class="pl-button" :disabled="busy" @click="openImportDialog">导入</button>
      </div>
    </div>

    <div v-if="scanResult" class="pl-status-filter">
      <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">
        全部 <strong>{{ scanResult.items.length }}</strong>
      </button>
      <button
        v-for="status in statuses"
        :key="status"
        :class="{ active: statusFilter === status }"
        @click="statusFilter = status"
      >
        {{ statusLabels[status] }} <strong>{{ statusCounts[status] || 0 }}</strong>
      </button>
    </div>

    <div v-if="scanResult" class="pl-record-toolbar">
      <span>共扫描 {{ scanResult.items.length }} 条，当前显示 {{ filteredItems.length }} 条</span>
      <div class="pl-record-batch-actions">
        <button
          class="pl-button pl-maintenance-primary"
          :disabled="busy || !selectedCleanItems.length"
          @click="openBatchCleanConfirm"
        >批量清洗{{ selectedCleanItems.length ? `（${selectedCleanItems.length}）` : "" }}</button>
        <button
          class="pl-button pl-maintenance-danger"
          :disabled="busy || !selectedItems.length"
          @click="openBatchDeleteConfirm"
        >批量删除{{ selectedItems.length ? `（${selectedItems.length}）` : "" }}</button>
      </div>
      <select v-model="statusFilter" class="pl-form-input">
        <option value="all">全部状态</option>
        <option v-for="status in statuses" :key="status" :value="status">{{ statusLabels[status] }}</option>
      </select>
    </div>

    <div v-if="scanResult" class="pl-record-table-wrap">
      <table class="pl-record-table">
        <thead>
          <tr>
            <th class="pl-select-cell">
              <input
                type="checkbox"
                aria-label="全选当前列表数据"
                :checked="allVisibleSelected"
                :indeterminate="someVisibleSelected"
                :disabled="!filteredItems.length"
                @change="toggleSelectAll"
              />
            </th>
            <th>状态</th>
            <th>Block ID</th>
            <th>文档位置</th>
            <th>正文</th>
            <th>异常原因</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in filteredItems" :key="item.blockId">
            <tr>
              <td class="pl-select-cell">
                <input
                  v-model="selectedBlockIds"
                  type="checkbox"
                  :value="item.blockId"
                  :aria-label="`选择块 ${item.blockId}`"
                />
              </td>
              <td><span :class="['pl-status-tag', `is-${item.status}`]">{{ statusLabels[item.status] }}</span></td>
              <td class="pl-ellipsis-cell" :title="item.blockId"><code>{{ item.blockId }}</code></td>
              <td class="pl-ellipsis-cell" :title="formatLocation(item)">{{ formatLocation(item) }}</td>
              <td class="pl-content-cell" :title="item.content">{{ item.content || "无法读取" }}</td>
              <td class="pl-reason-cell" :title="item.reasons.join('；')">{{ item.reasons.join("；") }}</td>
              <td class="pl-operation-cell">
                <button class="pl-table-action" :disabled="!item.blockId" @click="openBlock(item.blockId)">跳转</button>
                <button class="pl-table-action" @click="toggleAttribute(item.blockId)">
                  {{ expandedBlockId === item.blockId ? "收起" : "属性" }}
                </button>
                <button v-if="item.repairable" class="pl-table-action" @click="openCleanConfirm(item)">清洗</button>
              </td>
            </tr>
            <tr v-if="expandedBlockId === item.blockId" class="pl-attribute-row">
              <td colspan="7">
                <div>块 ID：<code>{{ item.blockId }}</code>　文档 ID：<code>{{ item.documentId || "无法读取" }}</code></div>
                <pre>{{ formatAttribute(item.rawAttribute) }}</pre>
              </td>
            </tr>
          </template>
          <tr v-if="!filteredItems.length">
            <td colspan="7" class="pl-maintenance-empty">当前筛选条件下没有数据。</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!scanning" class="pl-maintenance-empty">
      点击“扫描全部数据”后查看数据归属、异常和可清洗项目。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { showMessage } from "siyuan";
import BatchCleanConfirm from "@/components/BatchCleanConfirm.vue";
import BatchDeleteConfirm from "@/components/BatchDeleteConfirm.vue";
import CleanPledgeConfirm from "@/components/CleanPledgeConfirm.vue";
import CleanResultDialog from "@/components/CleanResultDialog.vue";
import ImportPledgeDialog from "@/components/ImportPledgeDialog.vue";
import { alert } from "@/utils/dialog-utils";
import {
  cleanPledgeData,
  deletePledgeData,
  importPledgeData,
  scanPledgeData,
  serializePledgeExport,
  type CleanResult,
  type ImportPreview,
  type ImportResult,
  type PledgeDataStatus,
  type PledgeScanItem,
  type PledgeScanResult,
} from "@/services/dataMaintenanceService";

const props = defineProps<{
  settingConfData: SettingConfig;
  openBlock: (blockId: string) => void;
}>();

const statuses: PledgeDataStatus[] = [
  "managed",
  "scattered",
  "conflict",
  "invalid_attribute",
  "broken_reference",
  "unresolved",
];
const statusLabels: Record<PledgeDataStatus, string> = {
  managed: "当前配置已管理",
  scattered: "散落但可识别归属",
  conflict: "属性与实际位置冲突",
  invalid_attribute: "属性或格式异常",
  broken_reference: "块或文档引用失效",
  unresolved: "无法判断归属",
};
const scanning = ref(false);
const cleaning = ref(false);
const deleting = ref(false);
const importing = ref(false);
const scanResult = ref<PledgeScanResult>();
const statusFilter = ref<PledgeDataStatus | "all">("all");
const expandedBlockId = ref("");
const selectedBlockIds = ref<string[]>([]);
const busy = computed(() => scanning.value || cleaning.value || deleting.value || importing.value);
const storageModeText = computed(() => props.settingConfData.bookkeepingStorageMode === "central" ? "集中存放" : "按日期存放");
const statusCounts = computed(() => {
  const counts = {} as Record<PledgeDataStatus, number>;
  for (const status of statuses) counts[status] = 0;
  for (const item of scanResult.value?.items || []) counts[item.status] += 1;
  return counts;
});
const filteredItems = computed(() => {
  if (!scanResult.value) return [];
  if (statusFilter.value === "all") return scanResult.value.items;
  return scanResult.value.items.filter(item => item.status === statusFilter.value);
});
const selectedItems = computed(() => {
  const selected = new Set(selectedBlockIds.value);
  return (scanResult.value?.items || []).filter(item => selected.has(item.blockId));
});
const selectedCleanItems = computed(() => selectedItems.value.filter(item => item.repairable));
const allVisibleSelected = computed(() => filteredItems.value.length > 0
  && filteredItems.value.every(item => selectedBlockIds.value.includes(item.blockId)));
const someVisibleSelected = computed(() => !allVisibleSelected.value
  && filteredItems.value.some(item => selectedBlockIds.value.includes(item.blockId)));

async function runScan() {
  await refreshScan(true);
}

async function refreshScan(resetOperationState: boolean) {
  scanning.value = true;
  if (resetOperationState) {
    selectedBlockIds.value = [];
  }
  try {
    scanResult.value = await scanPledgeData(props.settingConfData);
    const scannedIds = new Set(scanResult.value.items.map(item => item.blockId));
    selectedBlockIds.value = selectedBlockIds.value.filter(blockId => scannedIds.has(blockId));
    showMessage(`扫描完成，共发现 ${scanResult.value.items.length} 条 pledge 数据`, 2500, "info");
  } catch (error) {
    console.error("扫描 pledge 数据失败", error);
    showMessage(error instanceof Error ? error.message : "数据扫描失败", 3000, "error");
  } finally {
    scanning.value = false;
  }
}

function toggleSelectAll() {
  const visibleIds = new Set(filteredItems.value.map(item => item.blockId));
  if (allVisibleSelected.value) {
    selectedBlockIds.value = selectedBlockIds.value.filter(blockId => !visibleIds.has(blockId));
    return;
  }
  selectedBlockIds.value = Array.from(new Set([...selectedBlockIds.value, ...visibleIds]));
}

function openBatchCleanConfirm() {
  const items = [...selectedCleanItems.value];
  if (!items.length) return;
  alert(BatchCleanConfirm, {
    title: "批量清洗 pledge 属性",
    width: "860px",
    height: "auto",
    props: {
      items,
      async onConfirm() {
        cleaning.value = true;
        try {
          const result = await cleanPledgeData(items);
          selectedBlockIds.value = [];
          await refreshScan(false);
          showOperationResult("清洗结果", result);
          return true;
        } finally {
          cleaning.value = false;
        }
      },
    },
  });
}

function openBatchDeleteConfirm() {
  const items = [...selectedItems.value];
  if (!items.length) return;
  alert(BatchDeleteConfirm, {
    title: "批量删除 pledge 数据",
    width: "760px",
    height: "auto",
    props: {
      items,
      async onConfirm() {
        deleting.value = true;
        try {
          const result = await deletePledgeData(items);
          selectedBlockIds.value = [];
          expandedBlockId.value = "";
          await refreshScan(false);
          showOperationResult("删除结果", result);
          return true;
        } finally {
          deleting.value = false;
        }
      },
    },
  });
}

function exportData(scope: "managed" | "all") {
  if (!scanResult.value) return;
  const content = serializePledgeExport(scanResult.value, scope);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `siyuan-pledger-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function openImportDialog() {
  if (!scanResult.value) return;
  alert(ImportPledgeDialog, {
    title: "导入记账数据",
    width: "900px",
    height: "auto",
    props: {
      settingConfData: props.settingConfData,
      scanResult: scanResult.value,
      async onImport(preview: ImportPreview): Promise<ImportResult> {
        importing.value = true;
        try {
          const result = await importPledgeData(preview, props.settingConfData);
          await refreshScan(false);
          return result;
        } finally {
          importing.value = false;
        }
      },
    },
  });
}

function openBlock(blockId: string) {
  props.openBlock(blockId);
}

function toggleAttribute(blockId: string) {
  expandedBlockId.value = expandedBlockId.value === blockId ? "" : blockId;
}

function openCleanConfirm(item: PledgeScanItem) {
  if (!item.repairable || !item.proposedAttribute) return;
  alert(CleanPledgeConfirm, {
    title: "清洗 pledge 属性",
    width: "960px",
    height: "auto",
    props: {
      item,
      async onConfirm() {
        const result = await cleanPledgeData([item]);
        await refreshScan(false);
        showOperationResult("清洗结果", result);
        return true;
      },
    },
  });
}

/** 等确认弹窗关闭后再展示结果，避免两个弹窗重叠。 */
function showOperationResult(title: string, result: CleanResult) {
  window.setTimeout(() => {
    alert(CleanResultDialog, {
      title,
      width: "720px",
      height: "auto",
      props: { result },
    });
  }, 0);
}

function formatLocation(item: PledgeScanItem): string {
  const notebook = item.notebookName || item.notebookId || "未知笔记本";
  const path = item.hPath || item.path || item.documentId || "无法读取路径";
  return `${notebook} ${path}`;
}

function formatAttribute(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}
</script>

<style scoped>
.pl-maintenance {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
}

.pl-maintenance-header,
.pl-record-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pl-maintenance-header {
  min-height: 2.5rem;
}

.pl-maintenance-heading {
  min-width: 0;
}

.pl-maintenance-title-line {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.pl-maintenance-title-line h3 {
  margin: 0;
}

.pl-maintenance-title-line span,
.pl-maintenance-meta {
  color: var(--pl-color-text-secondary);
  font-size: 0.8rem;
  line-height: 1.5;
}

.pl-maintenance-title-line h3 {
  flex-shrink: 0;
}

.pl-maintenance-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.15rem;
}

.pl-maintenance-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}

.pl-maintenance-actions .pl-button {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  white-space: nowrap;
}

.pl-maintenance-primary {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}

.pl-maintenance button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.pl-record-table-wrap {
  overflow: auto;
  border: 1px solid var(--pl-color-border);
}

.pl-record-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pl-record-table th,
.pl-record-table td {
  padding: 0.32rem 0.4rem;
  border-bottom: 1px solid var(--pl-color-border);
  text-align: left;
  font-size: 0.75rem;
}

.pl-record-table th {
  color: var(--pl-color-text);
  background: var(--pl-color-surface-light);
  font-weight: bold;
}

.pl-status-filter {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow-x: auto;
  padding: 0.1rem 0;
  white-space: nowrap;
}

.pl-status-filter button {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--pl-color-border);
  border-radius: 0.4rem;
  color: var(--pl-color-text-secondary);
  background: var(--pl-color-surface);
  cursor: pointer;
  font-size: 0.75rem;
}

.pl-status-filter button:hover {
  color: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}

.pl-status-filter button.active {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}

.pl-status-filter strong {
  margin-left: 0.2rem;
  color: inherit;
}

.pl-record-toolbar select {
  width: 12rem;
}

.pl-record-batch-actions {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

.pl-record-batch-actions .pl-button {
  min-width: 7rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.pl-maintenance-danger {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-error);
  border-color: var(--pl-color-error);
}

.pl-record-table-wrap {
  max-height: 36rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.pl-record-table th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.pl-record-table tbody tr:hover:not(.pl-attribute-row) {
  background: var(--pl-color-surface-light);
}

.pl-record-table th:nth-child(1) { width: 3%; }
.pl-record-table th:nth-child(2) { width: 10%; }
.pl-record-table th:nth-child(3) { width: 13%; }
.pl-record-table th:nth-child(4) { width: 18%; }
.pl-record-table th:nth-child(5) { width: 23%; }
.pl-record-table th:nth-child(6) { width: 21%; }
.pl-record-table th:nth-child(7) { width: 12%; }

.pl-select-cell {
  text-align: center !important;
}

.pl-select-cell input {
  margin: 0;
  vertical-align: middle;
}

.pl-ellipsis-cell,
.pl-content-cell,
.pl-reason-cell {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pl-content-cell {
  color: var(--pl-color-text);
}

.pl-reason-cell {
  color: var(--pl-color-error);
}

.pl-operation-cell {
  white-space: normal;
}

.pl-record-table code {
  font-size: 0.7rem;
}

.pl-table-action {
  padding: 0.1rem 0.25rem;
  border: 0;
  color: var(--pl-color-primary);
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
}

.pl-table-action:hover {
  text-decoration: underline;
}

.pl-attribute-row td {
  padding: 0.6rem;
  color: var(--pl-color-text-secondary);
  background: var(--pl-color-surface-light);
}

.pl-attribute-row pre {
  max-height: 12rem;
  margin: 0.4rem 0 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.pl-status-tag {
  display: inline-block;
  max-width: 100%;
  padding: 0.15rem 0.4rem;
  border-radius: 0.3rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  vertical-align: middle;
  color: var(--pl-color-text);
  background: var(--pl-color-surface-light);
  font-size: 0.7rem;
}

.pl-status-tag.is-managed {
  color: var(--pl-color-primary);
}

.pl-status-tag.is-conflict,
.pl-status-tag.is-invalid_attribute,
.pl-status-tag.is-broken_reference {
  color: var(--pl-color-error);
}

.pl-maintenance-empty {
  padding: 2rem;
  text-align: center;
  color: var(--pl-color-text-secondary);
}
</style>
