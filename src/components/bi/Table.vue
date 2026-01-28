<template>
  <div class="overflow-x-auto h-112 w-96">
    <table class="table table-xs table-pin-rows table-pin-cols">
      <thead>
        <tr>
          <th class="w-[80px] min-w-[80px] max-w-[80px]"></th>
          <td class="w-[80px] min-w-[80px] max-w-[80px]"></td>
          <td v-for="t in times" :key="t">{{ t }}</td>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, rowIndex) in tableRows" :key="rowIndex" :class="{ 'bg-gray-100': row.isEvenGroup }">
          <th v-if="row.rowspan" :rowspan="row.rowspan" class="w-[80px] min-w-[80px] max-w-[80px]"
            :class="{ 'bg-gray-100': row.isEvenGroup }">
            {{ row.groupName }}
          </th>
          <td class="w-[80px] min-w-[80px] max-w-[80px]">
            {{ row.childName }}
          </td>
          <td v-for="(cell, i) in row.values" :key="i">
            {{ cell }}
          </td>
        </tr>
      </tbody>

      <tfoot>
        <tr>
          <th>
            <span class="py-2 text-black">总计 </span>
          </th>
          <td></td>
          <td v-for="(sum, i) in sumList" :key="i">
            <span class="py-2 text-black">
              {{ sum }}
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import currency from 'currency.js'

const props = defineProps<{
  data: LedgerItem[]
  times: string[]
  conf: string
}>()

const conf = computed<LedgerItem[]>(() => {
  try {
    return JSON.parse(props.conf)
  } catch {
    return []
  }
})

/**
 * 核心计算：
 * - tableRows：表格每一行
 * - sumMap：每一列的 number 汇总
 */
const tableResult = computed(() => {
  const rows: {
    groupName: string
    childName: string
    rowspan: number
    values: string[]
    isEvenGroup: boolean
  }[] = []

  const sumMap: number[] = Array(props.times.length).fill(0)
  let groupIndex = 0

  conf.value.forEach((group) => {
    if (!group.children?.length) return

    const isEvenGroup = groupIndex % 2 === 0

    group.children.forEach((child, childIndex) => {
      const values: string[] = []

      props.times.forEach((time, tIndex) => {
        let cell = '--'

        props.data.forEach((item) => {
          if (item.time !== time || item.name !== group.name) return
          if (!item.children) return

          item.children.forEach((ci) => {
            if (ci.name === child.name) {
              cell = currency(ci.amount, { symbol: '' }).format()
              sumMap[tIndex] += ci.amount   // ✅ 永远基于 number
            }
          })
        })

        values.push(cell)
      })

      rows.push({
        groupName: group.name,
        childName: child.name,
        rowspan: childIndex === 0 ? group.children.length : 0,
        values,
        isEvenGroup
      })
    })

    groupIndex++
  })

  return {
    rows,
    sumMap
  }
})

/**
 * 模板直接使用的行数据
 */
const tableRows = computed(() => tableResult.value.rows)

/**
 * 底部总计（只在这里 format）
 */
const sumList = computed(() =>
  tableResult.value.sumMap.map((v) =>
    currency(v, { symbol: '' }).format()
  )
)
</script>
