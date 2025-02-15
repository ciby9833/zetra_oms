<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMaterialStore } from '@/stores/material';
import type { Material } from '@/types/material';

interface Props {
  modelValue?: number;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  filterable?: boolean;
  remote?: boolean;
  size?: 'default' | 'small' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择物料',
  disabled: false,
  clearable: true,
  multiple: false,
  filterable: true,
  remote: true,
  size: 'default'
});

const emit = defineEmits(['update:modelValue', 'change']);

// 状态
const materialStore = useMaterialStore();
const loading = ref(false);
const keyword = ref('');
const materialOptions = ref<Material[]>([]);

// 远程搜索
const remoteSearch = async (query: string) => {
  if (!query) {
    materialOptions.value = [];
    return;
  }

  loading.value = true;
  try {
    const result = await materialStore.fetchMaterials({
      page: 1,
      pageSize: 20,
      keyword: query
    });
    materialOptions.value = result.list;
  } finally {
    loading.value = false;
  }
};

// 处理选择变化
const handleChange = (value: number | number[]) => {
  emit('update:modelValue', value);
  emit('change', value);
};

// 监听关键词变化
watch(keyword, (val) => {
  if (props.remote) {
    remoteSearch(val);
  }
});
</script>

<template>
  <el-select
    v-model="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :multiple="multiple"
    :filterable="filterable"
    :remote="remote"
    :remote-method="remoteSearch"
    :loading="loading"
    :size="size"
    @change="handleChange"
  >
    <el-option
      v-for="item in materialOptions"
      :key="item.material_id"
      :label="item.material_name"
      :value="item.material_id"
    >
      <div class="material-option">
        <span class="material-code">{{ item.material_code }}</span>
        <span class="material-name">{{ item.material_name }}</span>
        <span v-if="item.specifications" class="material-spec">
          {{ item.specifications }}
        </span>
      </div>
    </el-option>
  </el-select>
</template>

<style lang="scss" scoped>
.material-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .material-code {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .material-name {
    flex: 1;
  }

  .material-spec {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>
