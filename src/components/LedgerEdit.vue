<template>
  <div class="pl-ledger-edit-main">
    <div>
      <div class="pl-ledger-edit-label">
        <svg>
          <use xlink:href="#iconCalendar"></use>
        </svg>
        登记时间
        <span class="pl-ledger-badge">must</span>
      </div>
      <!-- 新增时可选日期，编辑时固定为当前记录日期 -->
      <DatePicker v-if="!isEditMode" class="pl-ledger-edit-input" v-model="selectedDate" />
      <div v-else class="pl-ledger-edit-input">{{ selectedDate }}</div>
    </div>

    <div>
      <div v-for="(lItem, index) in ledgerForm" :key="index">
        <div class="pl-ledger-edit-label">
          <IconDisplay class="pl-ledger-edit-icon" :icon="lItem.icon" fallback="iconD3List" />
          {{ lItem.name }}
        </div>
        <div class="pl-ledger-edit-form">
          <div class="" v-for="(lc, index) in lItem.children" :key="index">
            <fieldset>
              <legend>{{ lc.name }}</legend>
              <input class="pl-form-input" type="number" v-model="lc.amount" />
            </fieldset>
          </div>
        </div>
      </div>
    </div>

    <div class="pl-ledger-edit-footer">
      <button class="pl-button" @click="close">取消</button>
      <button class="pl-button pl-ledger-save" @click="update">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js";
import { ref } from 'vue';
import { getCurrentTime } from "@/api/siyuanApi"
import { deepClone } from "@/utils/pl-utils"
import DatePicker from "@/components/custom/DatePicker.vue";
import IconDisplay from "@/components/custom/IconDisplay.vue";

const emit = defineEmits<{
  (e: "update", value: LedgerItem[]): void
  (e: "close"): void
}>()

const props = defineProps<{
  ledgerData?: LedgerItem[], // 账本数据
  confData: SettingConfig, // 配置数据
  isMobile?: boolean // 是否为移动端
}>();

const ledgerForm = ref<LedgerItem[]>([])
const isEditMode = !!props.ledgerData?.length

const selectedDate = ref('')

if (props.ledgerData) {
  ledgerForm.value = deepClone(props.ledgerData)
  selectedDate.value = props.ledgerData[0].time || ''
} else {
  getCurrentTime().then(res => selectedDate.value = res)
  newLedgerForm()
}

// 根据 confData.config 初始化 newLedgerItem
function newLedgerForm() {
  ledgerForm.value = JSON.parse(props.confData.config).map((conf: any) => ({
    time: selectedDate.value,
    name: conf.name,
    amount: 0,
    icon: conf.icon,
    children: conf.children.map((child: any) => ({
      name: child.name,
      amount: 0
    }))
  }))
}

const update = () => {
  ledgerForm.value.forEach(item => {
    // 统一时间
    item.time = selectedDate.value
    // 计算子项金额汇总
    const total = (item.children || []).reduce(
      (sum, citem) => {
        citem.time = selectedDate.value
        return sum.add(citem.amount || 0)
      },
      currency(0)
    )
    // 父级金额 = 子项汇总
    item.amount = total.value
  })
  emit('update', ledgerForm.value)
}

const close = () => {
  emit('close')
}

</script>

<style scoped lang="css">
.pl-ledger-edit-main {
  margin: 1rem 1.6rem;
  color: var(--pl-color-text);
}

.pl-ledger-edit-label {
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.pl-ledger-edit-label svg {
  height: 1.2rem;
  width: 1.2rem;
}

.pl-ledger-edit-icon {
  height: 1.2rem;
  width: 1.2rem;
  font-size: 1.1rem;
}

.pl-ledger-edit-input {
  margin: 0.5rem 0.75rem 1rem;
  display: block;
  padding-left: 1rem;
  border-left: 1px solid var(--pl-color-border);
}

.pl-ledger-badge {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-primary);
  width: fit-content;
  justify-content: center;
  align-items: center;
  font-size: .5rem;
  display: inline-flex;
  vertical-align: middle;
  padding: 0.15rem 0.35rem;
  border-radius: .5rem;
  margin-left: 0.5rem;
}

.pl-ledger-edit-form fieldset {
  border: 0;
  display: grid;
}

.pl-ledger-edit-form {
  margin: 0.5rem 0.75rem 1rem;
  border-left: 1px solid var(--pl-color-border);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 768px) {
  .pl-ledger-edit-form {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

.pl-ledger-edit-form legend {
  color: var(--pl-color-text);
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  margin-bottom: -.25rem;
  padding-block: .5rem;
  font-weight: 600;
  display: flex;
}

.pl-ledger-edit-footer {
  display: flex;
  justify-content: end;
  gap: 1rem;
}

.pl-ledger-save {
  color: var(--b3-theme-on-primary, #fff);
  background-color: var(--pl-color-primary);
  border-color: var(--pl-color-primary);
}
</style>
