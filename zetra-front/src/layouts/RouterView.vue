<template>
  <div class="router-view-container">
    <router-view v-slot="{ Component }">
      <keep-alive :include="tabsStore.cachedViews">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { useTabsStore } from '@/stores/tabs'
const tabsStore = useTabsStore()
</script>

<style scoped>
.router-view-container {
  height: 100%;
  width: 100%;
}
</style>
