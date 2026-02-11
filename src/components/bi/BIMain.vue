<template>
  <div class="pl-bi-main">
    <div class="pl-bi-main-title">
      <slot name="title"></slot>
    </div>
    <div class="card-body p-0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="css">
.pl-bi-main {
  border: 1px solid #e6e6e7;
  border-radius: .5rem;
  padding: 1rem 1rem 0.5rem;
}

.pl-bi-main-title {
  font-size: 1rem;
  font-weight: bold;
}
</style>
