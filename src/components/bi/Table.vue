<template>
  <div class="pl-table-main ">
    <table class="table table-xs table-pin-rows table-pin-cols">
      <thead>
        <tr>
          <th class="table-left-width table-top-left-cross-1"></th>
          <th class="table-left-width table-top-left-cross-2"></th>
          <th v-for="t in times" :key="t">
            <span style="padding: 0 0.5rem;">{{ t }} </span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, rowIndex) in tableRows" :key="rowIndex" :class="{ 'bg-gray-100': row.isEvenGroup }">
          <th v-if="row.rowspan" :rowspan="row.rowspan" class="table-left-width table-left-1"
            :class="{ 'bg-gray-100': row.isEvenGroup }">
            {{ row.groupName }}
          </th>
          <td class="table-left-width table-left-2">
            {{ row.childName }}
          </td>
          <td v-for="(cell, i) in row.values" :key="i">
            {{ cell }}
          </td>
        </tr>
      </tbody>

      <tfoot>
        <tr>
          <th class="table-bottom-left-cross-1">
            <span>总计</span>
          </th>
          <th class="table-bottom-left-cross-2"></th>
          <td v-for="(sum, i) in sumList" :key="i">
            <span>
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
              sumMap[tIndex] += ci.amount
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

<style scoped lang="css">
.pl-table-main {
  height: 26.5rem;
  overflow: auto;
  position: relative;
  background: #fff;
}

.pl-table-main table {
  border-collapse: separate;
  border-spacing: 0;
}

.pl-table-main th,
.pl-table-main td {
  white-space: nowrap;
  text-align: right;
  border-bottom: 1px solid #e5e7eb;
}

.pl-table-main th {
  font-weight: 600;
  text-align: center;
  background: #fff;
}

.table-left-width {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
}

.pl-table-main thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fff;
}

.pl-table-main tfoot td,
.pl-table-main tfoot th {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: #fff;
  font-weight: 600;
}

.table-left-1 {
  position: sticky;
  left: 0;
  z-index: 1;
  text-align: left;
  background: #fff;
}

.table-left-2 {
  position: sticky;
  left: 80px;
  z-index: 1;
  text-align: left;
  background: #fff;
}

.pl-table-main .table-top-left-cross-1 {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 2;
  background: #fff;
}

.pl-table-main .table-top-left-cross-2 {
  position: sticky;
  top: 0;
  left: 80px;
  z-index: 2;
  background: #fff;
}

.pl-table-main .table-bottom-left-cross-1 {
  position: sticky;
  bottom: 0;
  left: 0;
  z-index: 2;
  background: #fff;
}

.pl-table-main .table-bottom-left-cross-2 {
  position: sticky;
  bottom: 0;
  left: 80px;
  z-index: 2;
  background: #fff;
}

.pl-table-main tr.bg-gray-100 td,
.pl-table-main tr.bg-gray-100 th {
  background-color: #f5f5f5;
}

.pl-table-main tr.bg-gray-100 .table-left-1,
.pl-table-main tr.bg-gray-100 .table-left-2 {
  background-color: #f5f5f5;
}

.pl-table-main td {
  padding: 0.4rem 0.5rem;
  font-variant-numeric: tabular-nums;
}

.pl-table-main tfoot td {
  color: #111827;
}

tfoot th,
tfoot td {
  border-top: 1px solid #e5e7eb;
}

thead span {
  margin-bottom: 0.5rem;
  display: block;
}
</style>
