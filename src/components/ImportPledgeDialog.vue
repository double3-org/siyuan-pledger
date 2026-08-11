<template>
  <div class="pl-import-dialog">
    <div class="pl-import-actions">
      <div>
        <strong>导入记账表格</strong>
        <span>请使用 CSV 模板填写；必填和选填字段已在表头标明。</span>
      </div>
      <button class="pl-button" :disabled="submitting" @click="downloadTemplate">下载模板</button>
      <button class="pl-button pl-import-primary" :disabled="submitting" @click="fileInput?.click()">选择 CSV</button>
      <input ref="fileInput" type="file" accept="text/csv,.csv" hidden @change="readFile" />
    </div>

    <div v-if="fileName" class="pl-import-file">已选择：{{ fileName }}</div>
    <div v-if="errorMessage" class="pl-import-error">{{ errorMessage }}</div>

    <template v-if="preview && !result">
      <div class="pl-import-summary">
        <span>可创建 <strong>{{ preview.create }}</strong></span>
        <span>重复 <strong>{{ preview.duplicate }}</strong></span>
        <span>分类冲突 <strong>{{ preview.conflict }}</strong></span>
        <span>损坏 <strong>{{ preview.damaged }}</strong></span>
      </div>

      <div class="pl-import-table-wrap">
        <table class="pl-import-table">
          <thead>
            <tr>
              <th>选择</th>
              <th>状态</th>
              <th>记账内容</th>
              <th>预检结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in preview.items" :key="item.index">
              <td class="pl-import-select">
                <input
                  v-model="item.selected"
                  type="checkbox"
                  :disabled="item.status === 'conflict' || item.status === 'damaged'"
                  :aria-label="`选择第 ${item.index + 1} 条导入数据`"
                />
              </td>
              <td :class="`is-${item.status}`">{{ statusLabels[item.status] }}</td>
              <td :title="formatRecord(item)">{{ formatRecord(item) }}</td>
              <td :title="item.reason">{{ item.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="pl-import-note">重复数据默认不选择；分类冲突和损坏数据不能导入，也不会覆盖现有记录。</p>
    </template>

    <template v-if="result">
      <div class="pl-import-summary">
        <span class="is-success">成功 <strong>{{ result.success }}</strong></span>
        <span>跳过 <strong>{{ result.skipped }}</strong></span>
        <span :class="{ 'is-failed': result.failed }">失败 <strong>{{ result.failed }}</strong></span>
      </div>
      <div class="pl-import-table-wrap">
        <table class="pl-import-table pl-import-result-table">
          <thead><tr><th>序号</th><th>状态</th><th>处理结果</th></tr></thead>
          <tbody>
            <tr v-for="item in result.details" :key="`${item.index}-${item.status}`">
              <td>{{ item.index + 1 }}</td>
              <td :class="`is-${item.status}`">{{ resultStatusLabels[item.status] }}</td>
              <td :title="item.reason">{{ item.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div class="pl-import-footer">
      <button class="pl-button" :disabled="submitting" @click="onClose">{{ result ? "关闭" : "取消" }}</button>
      <button
        v-if="preview && !result"
        class="pl-button pl-import-primary"
        :disabled="submitting || !selectedCount"
        @click="executeImport"
      >{{ submitting ? "导入中…" : `确认导入 ${selectedCount} 条` }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  preparePledgeImport,
  serializePledgeImportTemplate,
  type ImportPreview,
  type ImportPreviewItem,
  type ImportResult,
  type PledgeScanResult,
} from "@/services/dataMaintenanceService";

const props = defineProps<{
  settingConfData: SettingConfig;
  scanResult: PledgeScanResult;
  onImport: (preview: ImportPreview) => Promise<ImportResult>;
  onClose: () => void;
}>();

const fileInput = ref<HTMLInputElement>();
const fileName = ref("");
const errorMessage = ref("");
const submitting = ref(false);
const preview = ref<ImportPreview>();
const result = ref<ImportResult>();
const selectedCount = computed(() => preview.value?.items.filter(item => item.selected).length || 0);
const statusLabels = { create: "可创建", duplicate: "重复", conflict: "冲突", damaged: "损坏" };
const resultStatusLabels = { success: "成功", skipped: "跳过", failed: "失败" };

function downloadTemplate() {
  const blob = new Blob([serializePledgeImportTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "siyuan-pledger-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function readFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  fileName.value = file.name;
  errorMessage.value = "";
  preview.value = undefined;
  result.value = undefined;
  try {
    if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("仅支持导入 CSV 文件");
    preview.value = preparePledgeImport(await file.text(), props.settingConfData, props.scanResult);
  } catch (error) {
    console.error("读取导入文件失败", error);
    errorMessage.value = error instanceof Error ? error.message : "读取导入文件失败";
  }
}

async function executeImport() {
  if (!preview.value || !selectedCount.value) return;
  submitting.value = true;
  try {
    result.value = await props.onImport(preview.value);
  } finally {
    submitting.value = false;
  }
}

function formatRecord(item: ImportPreviewItem): string {
  if (!item.record) return item.sourceSummary || `第 ${item.index + 1} 条数据无法解析`;
  const type = item.record.type === "income" ? "收入" : "支出";
  const time = item.record.displayTime ? ` ${item.record.displayTime}` : "";
  const remark = item.record.remark ? `｜${item.record.remark}` : "";
  return `${item.record.date}${time}｜${type}｜${item.record.parentName}/${item.record.childName}｜${item.record.amount}${remark}`;
}
</script>

<style scoped>
.pl-import-dialog {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--pl-color-text);
  background: var(--pl-color-background);
}

.pl-import-actions,
.pl-import-footer,
.pl-import-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pl-import-actions > div {
  display: grid;
  gap: 0.15rem;
  margin-right: auto;
}

.pl-import-actions span,
.pl-import-file,
.pl-import-note {
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
}

.pl-import-summary {
  gap: 1.2rem;
  padding: 0.5rem 0;
}

.pl-import-summary .is-success,
.pl-import-table .is-create,
.pl-import-table .is-success {
  color: var(--pl-color-primary);
}

.pl-import-summary .is-failed,
.pl-import-table .is-conflict,
.pl-import-table .is-damaged,
.pl-import-table .is-failed,
.pl-import-error {
  color: var(--pl-color-error);
}

.pl-import-table .is-duplicate,
.pl-import-table .is-skipped {
  color: var(--pl-color-text-secondary);
}

.pl-import-table-wrap {
  max-height: 25rem;
  overflow: auto;
  border: 1px solid var(--pl-color-border);
}

.pl-import-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pl-import-table th,
.pl-import-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--pl-color-border);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.pl-import-table th {
  position: sticky;
  top: 0;
  background: var(--pl-color-surface-light);
}

.pl-import-table th:nth-child(1) { width: 8%; }
.pl-import-table th:nth-child(2) { width: 12%; }
.pl-import-table th:nth-child(3) { width: 50%; }
.pl-import-table th:nth-child(4) { width: 30%; }

.pl-import-result-table th:nth-child(1) { width: 12%; }
.pl-import-result-table th:nth-child(2) { width: 15%; }
.pl-import-result-table th:nth-child(3) { width: 73%; }

.pl-import-select {
  text-align: center !important;
}

.pl-import-note {
  margin: 0;
}

.pl-import-footer {
  justify-content: flex-end;
}

.pl-import-primary {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}
</style>
