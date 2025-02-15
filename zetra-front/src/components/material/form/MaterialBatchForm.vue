<script setup lang="ts">
import { ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { Material } from '@/types/material';

interface Props {
  modelValue: Partial<Material>;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const emit = defineEmits(['update:modelValue', 'validate']);

const formRef = ref<FormInstance>();

// 表单验证规则
const rules: FormRules = {
  shelf_life: [
    { type: 'number', min: 0, message: '保质期必须大于等于0', trigger: 'blur' }
  ],
  storage_conditions: [
    { max: 500, message: '长度不能超过 500 个字符', trigger: 'blur' }
  ],
  retrieval_conditions: [
    { max: 500, message: '长度不能超过 500 个字符', trigger: 'blur' }
  ]
};

// 表单验证方法
const validate = async () => {
  if (!formRef.value) return false;
  return await formRef.value.validate();
};

// 暴露验证方法给父组件
defineExpose({ validate });

// 更新表单数据
const updateForm = (key: keyof Material, value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};
</script>

<template>
  <el-form
    ref="formRef"
    :model="modelValue"
    :rules="rules"
    :disabled="disabled"
    label-width="100px"
  >
    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="批次管理" prop="batch_control">
          <el-switch
            :model-value="modelValue.batch_control"
            @update:model-value="val => updateForm('batch_control', val)"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="序列号管理" prop="serial_control">
          <el-switch
            :model-value="modelValue.serial_control"
            @update:model-value="val => updateForm('serial_control', val)"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="保质期(天)" prop="shelf_life">
          <el-input-number
            :model-value="modelValue.shelf_life"
            :min="0"
            :step="1"
            style="width: 100%"
            @update:model-value="val => updateForm('shelf_life', val)"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="存储条件" prop="storage_conditions">
      <el-input
        :model-value="modelValue.storage_conditions"
        type="textarea"
        :rows="3"
        placeholder="请输入存储条件要求"
        @update:model-value="val => updateForm('storage_conditions', val)"
      />
    </el-form-item>

    <el-form-item label="出库要求" prop="retrieval_conditions">
      <el-input
        :model-value="modelValue.retrieval_conditions"
        type="textarea"
        :rows="3"
        placeholder="请输入出库要求"
        @update:model-value="val => updateForm('retrieval_conditions', val)"
      />
    </el-form-item>

    <div v-if="modelValue.batch_control || modelValue.serial_control" class="tips">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
      >
        <template #title>
          <span class="font-bold">注意事项：</span>
        </template>
        <template #default>
          <ul class="list-disc list-inside mt-2">
            <li v-if="modelValue.batch_control">
              启用批次管理后，入库时需要录入批次信息
            </li>
            <li v-if="modelValue.serial_control">
              启用序列号管理后，入库时需要录入序列号信息
            </li>
            <li v-if="modelValue.batch_control && modelValue.shelf_life">
              已设置保质期为 {{ modelValue.shelf_life }} 天，系统将自动计算到期日期
            </li>
          </ul>
        </template>
      </el-alert>
    </div>
  </el-form>
</template>

<style lang="scss" scoped>
.tips {
  margin-top: 16px;

  :deep(.el-alert__title) {
    font-size: 14px;
  }

  ul {
    color: var(--el-text-color-regular);
    font-size: 13px;
    line-height: 1.8;
  }
}
</style>
