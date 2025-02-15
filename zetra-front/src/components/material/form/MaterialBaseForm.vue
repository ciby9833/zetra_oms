<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useMaterialStore } from '@/stores/material';
import type { Material } from '@/types/material';
import { useMaterialCategoryStore } from '@/stores/material/categoryStore';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import type { Category, Unit } from '@/types/material';

// 物料分类组件

interface Props {
  modelValue: Partial<Material>;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const emit = defineEmits(['update:modelValue', 'validate']);

const formRef = ref<FormInstance>();
const materialStore = useMaterialStore();
const categoryStore = useMaterialCategoryStore();
const unitStore = useMaterialUnitStore();

// 状态
const loading = ref(false);
const categoryOptions = ref<Category[]>([]);
const unitOptions = ref<Unit[]>([]);

const activeCategories = computed(() => {
  // 仅显示状态为 "active" 的分类
  return categoryStore.categories.filter(cat => cat.status === 'active');
});

// 加载基础数据
const loadBaseData = async () => {
  try {
    loading.value = true;
    const [categories, units] = await Promise.all([
      categoryStore.fetchCategoryTree(),
      unitStore.fetchUnits()
    ]);
    categoryOptions.value = categories;
    unitOptions.value = units;
  } catch (error) {
    console.error('加载基础数据失败:', error);
    ElMessage.error('加载基础数据失败');
  } finally {
    loading.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadBaseData();
});

// 表单验证规则
const rules: FormRules = {
  material_code: [
    { required: true, message: '请输入物料编码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9-_]+$/, message: '只能包含字母、数字、下划线和横线', trigger: 'blur' },
    {
      validator: async (rule, value, callback) => {
        if (!value) return callback();
        try {
          const exists = await materialStore.checkMaterialCode(
            value,
            props.modelValue.material_id
          );
          if (exists) {
            callback(new Error('物料编码已存在'));
          } else {
            callback();
          }
        } catch (error) {
          callback(new Error('验证失败'));
        }
      },
      trigger: 'blur'
    }
  ],
  material_name: [
    { required: true, message: '请输入物料名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  category_id: [
    { required: true, message: '请选择物料分类', trigger: 'change' }
  ],
  specifications: [
    { max: 200, message: '长度不能超过 200 个字符', trigger: 'blur' }
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
        <el-form-item label="物料编码" prop="material_code">
          <el-input
            v-model="modelValue.material_code"
            placeholder="请输入物料编码"
            @update:modelValue="val => updateForm('material_code', val)"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="物料名称" prop="material_name">
          <el-input
            v-model="modelValue.material_name"
            placeholder="请输入物料名称"
            @update:modelValue="val => updateForm('material_name', val)"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="物料分类" prop="category_id">
          <el-select
            v-model="modelValue.category_id"
            placeholder="请选择分类"
            clearable
            filterable
          >
            <el-option
              v-for="item in activeCategories"
              :key="item.category_id"
              :label="item.category_name"
              :value="item.category_id"
            />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="规格" prop="specifications">
          <el-input
            v-model="modelValue.specifications"
            placeholder="请输入规格"
            @update:modelValue="val => updateForm('specifications', val)"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="状态" prop="status">
      <el-switch
        v-model="modelValue.status"
        active-value="active"
        inactive-value="inactive"
        :active-text="'启用'"
        :inactive-text="'停用'"
        @change="val => updateForm('status', val)"
      />
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
:deep(.el-cascader) {
  width: 100%;
}
</style>
