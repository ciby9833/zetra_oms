<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import type { Unit } from '@/types/material';

interface Props {
  modelValue?: number | null;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  filterable?: boolean;
  unitType?: 'basic' | 'sub' | '';
  excludeIds?: number[];
  size?: 'default' | 'small' | 'large';
  activeOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择单位',
  disabled: false,
  clearable: true,
  multiple: false,
  filterable: true,
  unitType: '',
  size: 'default',
  activeOnly: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
  (e: 'change', value: number | number[]): void;
}>();

// 状态
const unitStore = useMaterialUnitStore();
const loading = ref(false);
const unitOptions = ref<Unit[]>([]);

// 获取单位数据
const unitsFiltered = computed(() => {
  let list = unitStore.allUnits;
  // 如传入 activeOnly 为 true，则过滤状态不为 active 的单位
  if (props.activeOnly) {
    list = list.filter(unit => unit.status === 'active');
  }
  // 如果传入了 excludeIds，则过滤掉这些单位
  if (props.excludeIds && props.excludeIds.length) {
    list = list.filter(unit => !props.excludeIds.includes(unit.unit_id));
  }
  // 如使用了 unitType 过滤（例如 basic/sub）
  if (props.unitType) {
    list = list.filter(unit => unit.unit_type === props.unitType);
  }
  return list;
});

// 加载单位选项
const loadUnits = async () => {
  loading.value = true;
  try {
    await unitStore.fetchUnits({ pageSize: 999 });
    const allUnits = unitStore.allUnits;

    // 根据类型过滤
    let filteredUnits = allUnits;
    if (props.unitType) {
      filteredUnits = allUnits.filter(unit => unit.unit_type === props.unitType);
    }

    // 过滤掉排除的单位
    unitOptions.value = props.excludeIds?.length
      ? filteredUnits.filter(unit => !props.excludeIds?.includes(unit.unit_id))
      : filteredUnits;

  } catch (error) {
    console.error('加载单位数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 处理选择变化
const handleChange = (value: number | number[]) => {
  emit('update:modelValue', value);
  emit('change', value);
};

// 监听单位类型变化
watch(() => props.unitType, () => {
  loadUnits();
});

// 监听排除ID变化
watch(() => props.excludeIds, () => {
  loadUnits();
}, { deep: true });

// 生命周期
onMounted(() => {
  loadUnits();
});
</script>

<template>
  <el-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :multiple="multiple"
    :filterable="filterable"
    :loading="loading"
    :size="size"
    @change="handleChange"
  >
    <el-option
      v-for="item in unitsFiltered"
      :key="item.unit_id"
      :label="`${item.unit_name} (${item.unit_code})`"
      :value="item.unit_id"
    >
      <div class="unit-option">
        <span class="unit-code">{{ item.unit_code }}</span>
        <span class="unit-name">{{ item.unit_name }}</span>
        <el-tag
          v-if="item.unit_type"
          size="small"
          :type="item.unit_type === 'basic' ? 'success' : 'warning'"
        >
          {{ item.unit_type === 'basic' ? '基本单位' : '子单位' }}
        </el-tag>
      </div>
    </el-option>
  </el-select>
</template>

<style lang="scss" scoped>
.unit-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .unit-code {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .unit-name {
    flex: 1;
  }
}
</style>
