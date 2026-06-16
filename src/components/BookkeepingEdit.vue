<template>
  <div class="pl-bookkeeping-edit-main">
    <section class="pl-bookkeeping-hero">
      <div class="pl-bookkeeping-type-tabs">
        <label :class="{ active: bookkeepingType === 'expense' }">
          <input type="radio" name="pl-bookkeeping-type" value="expense" v-model="bookkeepingType" />
          支出
        </label>
        <label :class="{ active: bookkeepingType === 'income' }">
          <input type="radio" name="pl-bookkeeping-type" value="income" v-model="bookkeepingType" />
          收入
        </label>
      </div>

      <div class="pl-bookkeeping-amount">
        <span>{{ amountText }}</span>
      </div>
    </section>

    <section class="pl-bookkeeping-category-panel">
      <div class="pl-bookkeeping-category">
        <button v-for="(item, index) in bookkeepingConfigList" :key="index" class="pl-bookkeeping-parent-tag"
          :class="{ active: selectedParentIndex === index }" @click="selectParent(index)">
          <IconDisplay class="pl-bookkeeping-parent-icon" :icon="item.icon" fallback="iconD3List" />
          {{ item.name }}
        </button>
      </div>

      <div class="pl-bookkeeping-children">
        <button v-for="(item, index) in childConfigList" :key="index" class="pl-bookkeeping-child-tag"
          :class="{ active: selectedChildIndex === index }" @click="selectedChildIndex = index">
          {{ item.name }}
        </button>
      </div>
    </section>

    <section class="pl-bookkeeping-action-area">
      <div class="pl-bookkeeping-calculator">
        <div class="pl-bookkeeping-keypad">
          <button v-for="key in keypadKeys" :key="key.value" :class="key.className" @click="handleKey(key.value)">
            <template v-if="key.value === 'backspace'">⌫</template>
            <template v-else-if="key.value === 'clear'">
              <span>↻</span>
              <span>再记</span>
            </template>
            <template v-else>{{ key.label }}</template>
          </button>
        </div>
      </div>

      <button class="pl-bookkeeping-confirm" :disabled="!canSave" @click="confirm">
        ✓ 保存记录
      </button>
    </section>

    <section class="pl-bookkeeping-footer">
      <div class="pl-bookkeeping-meta">
        <DatePicker v-model="selectedDate" placement="top" />
        <button v-if="!isRemarkOpen" class="pl-bookkeeping-remark-toggle" @click="isRemarkOpen = true">
          添加备注
        </button>
        <input v-else class="pl-bookkeeping-remark" v-model="remark" placeholder="添加备注..." />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js";
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { showMessage } from 'siyuan';
import { getCurrentTime } from "@/api/siyuanApi"
import DatePicker from "@/components/custom/DatePicker.vue";
import IconDisplay from "@/components/custom/IconDisplay.vue";

const emit = defineEmits<{
  (e: "update", value: BookkeepingRecord): void
  (e: "saveAgain", value: BookkeepingRecord, reset: () => void): void
  (e: "close"): void
}>();

const props = defineProps<{
  confData: SettingConfig // 配置数据
}>();

const bookkeepingType = ref<"expense" | "income">("expense");
const selectedParentIndex = ref(0);
const selectedChildIndex = ref(0);
const amountExpression = ref("0");
const selectedDate = ref("");
const remark = ref("");
const isRemarkOpen = ref(false);

getCurrentTime().then(res => selectedDate.value = res);

const keypadKeys = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "backspace", label: "退格", className: "delete" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "+", label: "+", className: "operator" },
  { value: "-", label: "-", className: "operator" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "*", label: "×", className: "operator" },
  { value: "/", label: "÷", className: "operator" },
  { value: "clear", label: "再记", className: "clear" },
  { value: "0", label: "0" },
  { value: ".", label: "." },
  { value: "=", label: "=", className: "equal" },
];

// 记账配置分类
const bookkeepingConfigList = computed<LedgerItem[]>(() => {
  try {
    const config = JSON.parse(props.confData.bookkeepingConfig || "[]");
    return Array.isArray(config) ? config : [];
  } catch {
    return [];
  }
});

const childConfigList = computed<LedgerItem[]>(() => {
  return bookkeepingConfigList.value[selectedParentIndex.value]?.children || [];
});

// 计算表达式求值函数
function calculateExpression(expression: string): number {
  const normalizedExpression = expression.replace(/[+\-*/.]$/, "");
  const tokens = normalizedExpression.match(/\d+(?:\.\d+)?|[+\-*/]/g) || [];
  if (tokens.length === 0) return 0;

  const values: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token !== "*" && token !== "/") {
      values.push(token);
      continue;
    }

    const prev = values.pop();
    const next = tokens[++i];
    if (!prev || !next) throw new Error("invalid expression");
    if (token === "/" && Number(next) === 0) throw new Error("divide by zero");

    const value = token === "*"
      ? currency(prev, { precision: 8 }).multiply(next).value
      : currency(prev, { precision: 8 }).divide(next).value;
    values.push(String(value));
  }

  let result = currency(values[0] || 0, { precision: 8 });
  for (let i = 1; i < values.length; i += 2) {
    const operator = values[i];
    const value = values[i + 1];
    result = operator === "+" ? result.add(value || 0) : result.subtract(value || 0);
  }

  return Number(result.value.toFixed(2));
}

const currentAmount = computed(() => {
  try {
    return calculateExpression(amountExpression.value);
  } catch {
    return 0;
  }
});

const amountText = computed(() => amountExpression.value.replace(/\*/g, "×").replace(/\//g, "÷"));
const canSave = computed(() => currentAmount.value > 0);

const selectParent = (index: number) => {
  selectedParentIndex.value = index;
  selectedChildIndex.value = 0;
}

const handleKey = (key: string) => {
  if (/^\d$/.test(key)) {
    inputNumber(key);
    return;
  }

  if (key === ".") {
    inputDecimal();
    return;
  }

  if (["+", "-", "*", "/"].includes(key)) {
    inputOperator(key);
    return;
  }

  if (key === "=") {
    calculate();
    return;
  }

  if (key === "backspace") {
    deleteAmount();
    return;
  }

  if (key === "clear") {
    saveAgain();
  }
}

const inputNumber = (value: string) => {
  amountExpression.value = amountExpression.value === "0" ? value : amountExpression.value + value;
}

const inputDecimal = () => {
  const currentNumber = amountExpression.value.split(/[+\-*/]/).pop() || "";
  if (currentNumber.includes(".")) return;
  amountExpression.value += currentNumber ? "." : "0.";
}

const inputOperator = (value: string) => {
  if (/[+\-*/.]$/.test(amountExpression.value)) {
    amountExpression.value = amountExpression.value.slice(0, -1) + value;
    return;
  }
  amountExpression.value += value;
}

const calculate = () => {
  try {
    amountExpression.value = formatAmount(calculateExpression(amountExpression.value));
  } catch (error) {
    showMessage("金额计算错误", 2000, "error");
  }
}

const deleteAmount = () => {
  amountExpression.value = amountExpression.value.length > 1 ? amountExpression.value.slice(0, -1) : "0";
}

const confirm = () => {
  const data = getBookkeepingRecord();
  if (!data) return;

  console.log("记账数据", data);
  emit("update", data);
}

const saveAgain = () => {
  const data = getBookkeepingRecord();
  if (!data) return;

  console.log("再记数据", data);
  emit("saveAgain", data, resetForm);
}

function getBookkeepingRecord(): BookkeepingRecord | undefined {
  const amount = currentAmount.value;
  const parent = bookkeepingConfigList.value[selectedParentIndex.value];
  const child = childConfigList.value[selectedChildIndex.value];

  if (!parent || !child) {
    showMessage("请选择记账标签", 2000, "info");
    return;
  }

  if (amount <= 0) {
    showMessage("金额必须大于 0", 2000, "info");
    return;
  }

  return {
    type: bookkeepingType.value,
    date: selectedDate.value,
    parentName: parent.name,
    childName: child.name,
    amount,
    remark: remark.value,
  };
}

function resetForm() {
  amountExpression.value = "0";
  remark.value = "";
  isRemarkOpen.value = false;
}

const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
    if (event.key === "Escape") emit("close");
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    handleKey(event.key);
    return;
  }

  if (["+", "-", "*", "/", "."].includes(event.key)) {
    event.preventDefault();
    handleKey(event.key);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    confirm();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    deleteAmount();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));

function formatAmount(value: number): string {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
</script>

<style scoped lang="css">
.pl-bookkeeping-edit-main {
  display: grid;
  gap: 0.8rem;
  padding: 0.6rem 1.2rem;
  color: #111827;
  background-color: #f9fafb;
  height: calc(100% - 1.2rem);
  border-radius: 0 0 14px 14px;
}

.pl-bookkeeping-hero {
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.pl-bookkeeping-type-tabs {
  display: flex;
  height: 33px;
  overflow: hidden;
  padding: 0.25rem;
  background-color: #f3f4f6;
  border-radius: 10px;
}

.pl-bookkeeping-type-tabs input {
  display: none;
}

.pl-bookkeeping-type-tabs label {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.pl-bookkeeping-type-tabs label:has(input[value="expense"]:checked) {
  color: #fff;
  background-color: #ef4444;
}

.pl-bookkeeping-type-tabs label:has(input[value="income"]:checked) {
  color: #fff;
  background-color: #22c55e;
}

.pl-bookkeeping-amount {
  display: flex;
  align-items: center;
  justify-content: end;
  height: 50px;
  min-width: 0;
  padding: 0 1.25rem;
  color: #111827;
  background-color: #f7f8fa;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 2rem;
  font-weight: 600;
  word-break: break-all;
}

.pl-bookkeeping-category-panel {
  display: grid;
  gap: 0.2rem;
  padding: 0 0.25rem;
}

.pl-bookkeeping-category {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
}

.pl-bookkeeping-children {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pl-bookkeeping-parent-tag,
.pl-bookkeeping-child-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 33px;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
}

.pl-bookkeeping-parent-tag {
  flex-shrink: 0;
  padding: 0 12px;
  color: #4f46e5;
  background-color: #eef2ff;
  font-size: 0.875rem;
}

.pl-bookkeeping-parent-icon {
  width: 1rem;
  height: 1rem;
  font-size: 1rem;
}

.pl-bookkeeping-parent-tag.active {
  color: #fff;
  background-color: #2563eb;
}

.pl-bookkeeping-child-tag {
  height: 33px;
  padding: 0 20px;
  color: #374151;
  background-color: #f3f4f6;
  font-size: 0.875rem;
}

.pl-bookkeeping-child-tag:hover {
  background-color: #dbeafe;
}

.pl-bookkeeping-child-tag.active {
  color: #fff;
  background-color: #2563eb;
}

.pl-bookkeeping-action-area {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8rem;
  gap: 0.75rem;
  align-items: stretch;
}

.pl-bookkeeping-calculator {
  padding: 1rem;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.pl-bookkeeping-keypad {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem 2rem;
}

.pl-bookkeeping-keypad button {
  min-height: 34px;
  color: #fff;
  background-color: #2b2b2b;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 30px;
  font-weight: 600;
}

.pl-bookkeeping-keypad button:hover {
  background-color: #3a3a3a;
}

.pl-bookkeeping-keypad button:active {
  background-color: #4a4a4a;
}

.pl-bookkeeping-keypad button.delete {
  grid-column: span 2 / span 2;
  background-color: #374151;
}

.pl-bookkeeping-keypad button.operator {
  background-color: #3b4252;
}

.pl-bookkeeping-keypad button.clear {
  display: grid;
  place-items: center;
  font-size: 0.9rem;
}

.pl-bookkeeping-keypad button.equal {
  grid-column: span 2 / span 2;
  background-color: #2563eb;
  font-size: 32px;
}

.pl-bookkeeping-footer {
  display: block;
}

.pl-bookkeeping-meta {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.pl-bookkeeping-remark-toggle,
.pl-bookkeeping-remark {
  min-width: 0;
  height: 36px;
  color: #6b7280;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  font-size: 0.875rem;
}

.pl-bookkeeping-remark-toggle {
  text-align: left;
  padding: 0 0.75rem;
  cursor: pointer;
}

.pl-bookkeeping-remark {
  padding: 0 0.75rem;
}

.pl-bookkeeping-confirm {
  width: 100%;
  height: 100%;
  min-height: 72px;
  color: #fff;
  background-color: #16a34a;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.pl-bookkeeping-confirm:hover {
  background-color: #15803d;
}

.pl-bookkeeping-confirm:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 768px) {
  .pl-bookkeeping-hero,
  .pl-bookkeeping-meta {
    grid-template-columns: 1fr;
  }

  .pl-bookkeeping-action-area {
    grid-template-columns: 1fr;
  }

  .pl-bookkeeping-keypad {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .pl-bookkeeping-confirm {
    height: 56px;
  }
}
</style>
