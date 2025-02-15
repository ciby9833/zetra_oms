import { ref, onMounted, onUnmounted } from 'vue';
import { useMaterialStore } from '@/stores/material';
import type { Material } from '@/types/material';

export function useMaterialData(autoLoad = true) {
  const materialStore = useMaterialStore();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // 加载数据
  const loadData = async () => {
    loading.value = true;
    error.value = null;
    try {
      await materialStore.initialize();
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  // 自动加载
  if (autoLoad) {
    onMounted(() => {
      loadData();
    });
  }

  // 清理数据
  onUnmounted(() => {
    materialStore.clearAll();
  });

  return {
    loading,
    error,
    loadData,
    materials: materialStore.materialDetails,
    categories: materialStore.categories,
    units: materialStore.units,
    conversions: materialStore.conversions
  };
}
