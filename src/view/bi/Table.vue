<template>
  <div class="overflow-x-auto h-112 w-96">
    <table class="table table-xs table-pin-rows table-pin-cols">
      <thead>
        <tr>
          <!-- 用日期作为表头 -->
          <th style="min-width: 80px;"></th>
          <td style="min-width: 80px;"></td>
          <td v-for="t in times">{{ t }}</td>
        </tr>
      </thead>
      <tbody>
        <template v-for="(c, index) in conf">
          <tr v-for="(child, childIndex) in c.children">
            <th :rowspan="c.children?.length" v-if="childIndex === 0">{{ c.name }}</th>
            <td>{{ child.name }}</td>
            <td v-for="(t, tIndex) in times">
              {{ tableData.dataList[index * (c.children?.length ?? 0) + childIndex][tIndex] }}
            </td>
          </tr>
        </template>
      </tbody>
      <tfoot>
        <tr>
          <th>总计</th>
          <td></td>
          <td v-for="sum in tableData.sumList">
            {{ sum }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import currency from 'currency.js';
import { computed } from 'vue';

const props = defineProps<{
  data: LedgerItem[];
  times: string[];
  conf: string;
}>();

const conf = computed(() => {
  try {
    return JSON.parse(props.conf) as LedgerItem[];
  } catch (e) {
    return [];
  }
});

// 根据 props.times 和 props.confg 生成表格数据
// 表格数据用 props.data 进行填充
const tableData = computed(() => {
  const list: string[][] = [];
  const sumList: number[] = [];
  for (const c of conf.value) {
    if (c.children == null) continue;
    for (const child of c.children) {
      const row: string[] = [];
      props.times.forEach((t, tIndex) => {
        let s = '--'
        var sum = sumList[tIndex] ?? 0;
        for (const item of props.data) {
          if (item.time === t && item.name === c.name && item.children) {
            for (const childItem of item.children) {
              if (childItem.name === child.name) {
                s = currency(childItem.amount, { symbol: "" }).format();
                sum = currency(sum).add(childItem.amount).value;
              }
            }
          }
        }
        row.push(s);
        sumList[tIndex] = sum;
      });
      list.push(row);
    }
  }
  return {
    dataList: list,
    sumList: sumList.map((v) => currency(v, {
      symbol: "",
    }).format()),
  };
});


</script>
