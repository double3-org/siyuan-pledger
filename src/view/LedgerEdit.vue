<template>
  <div class="m-4">
    <div class="m-3">
      <div class="font-bold inline-flex items-center gap-2">
        <svg class="h-4 w-4 stroke-current">
          <use xlink:href="#iconCalendar"></use>
        </svg>
        登记时间
        <span class="badge badge-neutral badge-xs">must</span>
      </div>
      <!-- 日期 -->
      <div class="ml-2 pl-4 border-l border-gray-400 grid grid-cols-3 mx-3 mt-2 mb-4">
        <label class="input input-ghost w-fit">
          <button class="btn btn-link no-underline h-auto min-h-0 px-1 leading-none" popovertarget="cally-popover"
            style="anchor-name:--cally1">
            {{ selectedDate }}
          </button>
        </label>
      </div>

      <!-- 日期选择器 -->
      <div popover id="cally-popover" class="dropdown bg-base-100 rounded-box shadow-lg"
        style="position-anchor:--cally1">
        <calendar-date class="cally" @change="onDateChange">
          <svg slot="previous" class="fill-current size-4">
            <use xlink:href="#iconLeft"></use>
          </svg>
          <svg slot="next" class="fill-current size-4">
            <use xlink:href="#iconRight"></use>
          </svg>
          <calendar-month></calendar-month>
        </calendar-date>
      </div>
    </div>

    <div>
      <div v-for="(lItem, index) in ledgerForm" :key="index" class="m-3">
        <div class="font-bold inline-flex items-center gap-2">
          <svg class="h-4 w-4 stroke-current">
            <use :xlink:href="`#${lItem.icon}`"></use>
          </svg>
          {{ lItem.name }}
        </div>
        <div class="ml-2 pl-4 border-l border-gray-400 grid grid-cols-3 mx-3 mt-2 mb-4">
          <div class="col-span-1" v-for="(lc, index) in lItem.children" :key="index">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">{{ lc.name }}</legend>
              <input type="number" v-model="lc.amount" class="input input-sm w-[168px]" />
            </fieldset>
          </div>
        </div>

      </div>
    </div>

    <div class="flex justify-end gap-5 p-6">
      <button class="btn btn-outline btn-sm" @click="close">取消</button>
      <button class="btn btn-info btn-sm" @click="update">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import currency from "currency.js";
import { ref } from 'vue';
import { getCurrentTime } from "../api/siyuanApi"

const emit = defineEmits<{
  (e: "update", value: LedgerItem[]): void
  (e: "close"): void
}>()

const ledgerForm = ref<LedgerItem[]>([])

const props = defineProps<{
  ledgerData?: LedgerItem[], // 账本数据
  confData: SettingConfig // 配置数据
}>();

const selectedDate = ref()
getCurrentTime().then(res => selectedDate.value = res)

if (props.ledgerData) {
  ledgerForm.value = props.ledgerData
  selectedDate.value = props.ledgerData[0].time || ''
} else {
  newLedgerForm()
}

const onDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedDate.value = target.value
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