<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { Material } from '@/types/material';
import UnitSelect from '../UnitSelect.vue';

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
  unit: [
    { required: true, message: '请选择基本单位', trigger: 'change' }
  ],
  conversion_rate: [
    {
      validator: (rule, value, callback) => {
        if (props.modelValue.sub_unit && !value) {
          callback(new Error('请输入换算比率'));
        } else if (value && value <= 0) {
          callback(new Error('换算比率必须大于0'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    }
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
const updateForm = (key: string, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

// 监听子单位变化
watch(() => props.modelValue.sub_unit, (val) => {
  if (!val) {
    updateForm('conversion_rate', undefined);
  }
});
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
      <el-col :span="12">
        <el-form-item label="基本单位" prop="unit">
          <UnitSelect
            v-model="modelValue.unit"
            unit-type="basic"
            :exclude-ids="modelValue.sub_unit ? [modelValue.sub_unit] : []"
            @change="val => updateForm('unit', val)"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="子单位" prop="sub_unit">
          <UnitSelect
            v-model="modelValue.sub_unit"
            unit-type="sub"
            :exclude-ids="modelValue.unit ? [modelValue.unit] : []"
            @change="val => updateForm('sub_unit', val)"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item
      v-if="modelValue.sub_unit"
      label="换算比率"
      prop="conversion_rate"
    >
      <el-input-number
        v-model="modelValue.conversion_rate"
        :min="0.000001"
        :precision="6"
        :step="0.1"
        style="width: 200px"
        @change="val => updateForm('conversion_rate', val)"
      />
      <span class="ml-2 text-gray-500">
        1{{ modelValue.unit }} = {{ modelValue.conversion_rate }}{{ modelValue.sub_unit }}
      </span>
    </el-form-item>

    <el-form-item label="计量单位" prop="unit_id">
      <unit-select v-model="form.unit_id" placeholder="请选择计量单位" :activeOnly="true" />
    </el-form-item>
  </el-form>
</template>
