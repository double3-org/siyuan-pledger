<template>
  <div class="pl-clean-confirm">
    <div class="pl-clean-compare">
      <section>
        <h4>现有属性</h4>
        <pre><span
          v-for="(line, index) in currentLines"
          :key="index"
          :class="['pl-json-line', { changed: line.changed }]"
        >{{ line.text }}</span></pre>
      </section>
      <section>
        <h4>修改后数据</h4>
        <pre><span
          v-for="(line, index) in proposedLines"
          :key="index"
          :class="['pl-json-line', { changed: line.changed }]"
        >{{ line.text }}</span></pre>
      </section>
    </div>

    <div class="pl-clean-footer">
      <span>仅更新 custom-pledge 属性，不修改正文、移动或删除块。</span>
      <button class="pl-button" :disabled="submitting" @click="onClose">取消</button>
      <button class="pl-button pl-clean-primary" :disabled="submitting" @click="confirmClean">
        {{ submitting ? "清洗中…" : "确认清洗" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { PledgeScanItem } from "@/services/dataMaintenanceService";

const props = defineProps<{
  item: PledgeScanItem;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}>();

const submitting = ref(false);
const currentLines = computed(() => formatJsonLines(parseCurrentAttribute()));
const proposedLines = computed(() => formatJsonLines(props.item.proposedAttribute));

async function confirmClean() {
  submitting.value = true;
  try {
    if (await props.onConfirm()) props.onClose();
  } finally {
    submitting.value = false;
  }
}

function parseCurrentAttribute(): unknown {
  try {
    return JSON.parse(props.item.rawAttribute);
  } catch {
    return props.item.rawAttribute;
  }
}

function formatJsonLines(value: unknown): { text: string; changed: boolean }[] {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.split("\n").map(line => {
    const field = line.match(/^\s*"([^"]+)"\s*:/)?.[1] || "";
    return { text: line, changed: props.item.changes.includes(field) };
  });
}
</script>

<style scoped>
.pl-clean-confirm {
  display: grid;
  grid-template-rows: auto auto;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--pl-color-text);
  background: var(--pl-color-background);
}

.pl-clean-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  min-height: 0;
}

.pl-clean-compare section {
  display: grid;
  grid-template-rows: auto auto;
  min-width: 0;
}

.pl-clean-compare h4 {
  margin: 0 0 0.4rem;
}

.pl-clean-compare pre {
  height: 20rem;
  margin: 0;
  padding: 0.65rem;
  overflow: auto;
  border: 1px solid var(--pl-color-border);
  color: var(--pl-color-text);
  background: var(--pl-color-surface-light);
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.75rem;
}

.pl-json-line {
  display: block;
  min-height: 1.4em;
  padding-left: 0.35rem;
  border-left: 2px solid transparent;
}

.pl-json-line.changed {
  border-left-color: var(--pl-color-error);
  color: var(--pl-color-error);
  background: color-mix(in srgb, var(--pl-color-error) 8%, transparent);
}

.pl-clean-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.1rem;
}

.pl-clean-footer span {
  margin-right: auto;
  align-self: center;
  color: var(--pl-color-text-secondary);
  font-size: 0.75rem;
}

.pl-clean-primary {
  color: var(--b3-theme-on-primary, #fff);
  background: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}
</style>
