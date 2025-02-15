<template>
  <el-dialog
    :title="dialogTitle"
    v-model="visible"
    :close-on-click-modal="false"
    width="700px"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      :disabled="type === 'view'"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="物料编码" prop="material_code">
            <el-input
              v-model="form.material_code"
              placeholder="请输入物料编码"
              :disabled="type === 'edit'"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="物料名称" prop="material_name">
            <el-input
              v-model="form.material_name"
              placeholder="请输入物料名称"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="物料分类" prop="category_id">
            <el-cascader
              v-model="form.category_id"
              :options="categoryOptions"
              :props="{
                checkStrictly: true,
                label: 'category_name',
                value: 'category_id',
                emitPath: false
              }"
              placeholder="请选择物料分类"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="基本单位" prop="unit">
            <el-select
              v-model="form.unit"
              filterable
              placeholder="请选择基本单位"
            >
              <el-option
                v-for="unit in unitOptions"
                :key="unit.unit_id"
                :label="`${unit.unit_name} (${unit.unit_code})`"
                :value="unit.unit_id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="子单位" prop="sub_unit">
            <el-select
              v-model="form.sub_unit"
              filterable
              clearable
              placeholder="请选择子单位"
              @change="handleSubUnitChange"
            >
              <el-option
                v-for="unit in subUnitOptions"
                :key="unit.unit_id"
                :label="`${unit.unit_name} (${unit.unit_code})`"
                :value="unit.unit_id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            label="换算比率"
            prop="conversion_rate"
            v-if="form.sub_unit"
          >
            <el-input-number
              v-model="form.conversion_rate"
              :min="0.01"
              :precision="2"
              :step="0.1"
              style="width: 100%"
              placeholder="请输入换算比率"
            />
            <div class="conversion-hint" v-if="form.unit && form.sub_unit">
              <span>1{{ getUnitName(form.unit) }} = {{ form.conversion_rate || '?' }}{{ getUnitName(form.sub_unit) }}</span>
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="保质期(天)" prop="shelf_life">
            <el-input-number
              v-model="form.shelf_life"
              :min="0"
              placeholder="请输入保质期"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规格" prop="specifications">
            <el-input
              v-model="form.specifications"
              placeholder="请输入规格"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="批次管理" prop="batch_control">
            <el-switch v-model="form.batch_control" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="序列号管理" prop="serial_control">
            <el-switch v-model="form.serial_control" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="状态" prop="status">
            <el-switch
              v-model="form.status"
              active-value="active"
              inactive-value="inactive"
              :active-text="'启用'"
              :inactive-text="'停用'"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="入库要求" prop="storage_conditions">
        <el-input
          v-model="form.storage_conditions"
          type="textarea"
          :rows="2"
          placeholder="请输入入库要求"
        />
      </el-form-item>

      <el-form-item label="出库要求" prop="retrieval_conditions">
        <el-input
          v-model="form.retrieval_conditions"
          type="textarea"
          :rows="2"
          placeholder="请输入出库要求"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-if="type !== 'view'"
        type="primary"
        :loading="loading"
        @click="handleSubmit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useMaterialStore } from '@/stores/material';
import { useMaterialCategoryStore } from '@/stores/material/categoryStore';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import type { Material, Category, Unit } from '@/types/material';
import * as materialApi from '@/api/material';

interface Props {
  modelValue: boolean;
  type: 'add' | 'edit' | 'view';
  materialId?: number | null;
}

interface MaterialForm {
  material_code: string;
  material_name: string;
  category_id: number | null;
  unit: string;
  sub_unit?: string;
  conversion_rate?: number;
  shelf_life?: number;
  specifications?: string;
  batch_control: boolean;
  serial_control: boolean;
  status: 'active' | 'inactive';
  storage_conditions?: string;
  retrieval_conditions?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  type: 'add',
  materialId: null
});

const emit = defineEmits(['update:modelValue', 'success']);

// Store
const materialStore = useMaterialStore();
const categoryStore = useMaterialCategoryStore();
const unitStore = useMaterialUnitStore();

// 状态
const formRef = ref<FormInstance>();
const loading = ref(false);
const categoryOptions = ref<Category[]>([]);
const unitOptions = computed(() =>
  unitStore.allUnits.filter(unit => unit.unit_type === 'basic')
);
const subUnitOptions = computed(() =>
  unitStore.allUnits.filter(unit => unit.unit_type === 'sub')
);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const dialogTitle = computed(() => {
  const titles = {
    add: '新增物料',
    edit: '编辑物料',
    view: '查看物料'
  };
  return titles[props.type];
});

// 表单数据
const defaultForm = {
  material_code: '',
  material_name: '',
  description: '',
  specifications: '',
  category_id: undefined,
  unit: undefined,
  sub_unit: undefined,
  conversion_rate: undefined,
  shelf_life: undefined,
  batch_control: false,
  serial_control: false,
  storage_conditions: '',
  retrieval_conditions: '',
  status: 'active'
} as Partial<Material>;

const form = ref<Partial<Material>>({ ...defaultForm });

// 表单验证规则
const rules: FormRules = {
  material_code: [
    { required: true, message: '请输入物料编码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9-_]+$/, message: '只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  material_name: [
    { required: true, message: '请输入物料名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  unit: [
    { required: true, message: '请选择基本单位', trigger: 'change' }
  ],
  conversion_rate: [
    {
      required: true,
      message: '请输入换算比率',
      trigger: 'blur',
      validator: (rule: any, value: any, callback: any) => {
        if (form.value.sub_unit && !value) {
          callback(new Error('请输入换算比率'));
        } else if (value && value <= 0) {
          callback(new Error('换算比率必须大于0'));
        } else {
          callback();
        }
      }
    }
  ],
  shelf_life: [
    { type: 'number', min: 0, message: '保质期必须大于等于0', trigger: 'blur' }
  ]
};

// 加载基础数据
const loadBaseData = async () => {
  try {
    loading.value = true;
    const [categories, units] = await Promise.all([
      categoryStore.fetchCategoryTree(),
      unitStore.fetchUnits({ pageSize: 999 })
    ]);
    categoryOptions.value = categories;
  } catch (error) {
    console.error('加载基础数据失败:', error);
    ElMessage.error('加载基础数据失败');
  } finally {
    loading.value = false;
  }
};

// 方法定义
const loadData = async () => {
  if (props.materialId && (props.type === 'edit' || props.type === 'view')) {
    try {
      loading.value = true;
      const { data } = await getMaterialById(props.materialId);
      if (data.success) {
        form.value = {
          ...data.data,
          conversion_rate: data.data.conversion_rate ? Number(data.data.conversion_rate) : undefined,
          shelf_life: data.data.shelf_life ? Number(data.data.shelf_life) : undefined
        };
      }
    } catch (error: any) {
      ElMessage.error(error.message || '获取物料信息失败');
    } finally {
      loading.value = false;
    }
  } else {
    form.value = { ...defaultForm };
  }
};

// 获取单位名称的辅助函数
const getUnitName = (unitId: number) => {
  const unit = unitStore.allUnits.find(u => u.unit_id === unitId);
  return unit ? unit.unit_name : '';
};

// 子单位变更处理
const handleSubUnitChange = (value: number | null) => {
  if (!value) {
    form.value.conversion_rate = undefined;
  }
};

// 监听子单位变化
watch(() => form.value.sub_unit, (newVal) => {
  if (!newVal) {
    form.value.conversion_rate = undefined;
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const submitData = {
          ...form.value,
          conversion_rate: form.value.sub_unit ? form.value.conversion_rate : null,
          shelf_life: form.value.shelf_life || null
        };

        if (props.type === 'add') {
          await materialStore.createMaterial(submitData);
          ElMessage.success('创建成功');
        } else if (props.type === 'edit') {
          await materialStore.updateMaterial(props.materialId!, submitData);
          ElMessage.success('更新成功');
        }
        emit('success');
        visible.value = false;
      } catch (error: any) {
        ElMessage.error(error.message || '操作失败');
      } finally {
        loading.value = false;
      }
    }
  });
};

// 监听弹窗显示
watch(visible, (val) => {
  if (val) {
    loadData();
    loadBaseData();
  }
});

// 生命周期
onMounted(() => {
  if (visible.value) {
    loadData();
    loadBaseData();
  }
});

// 监听 materialId 的变化
watch(
  () => props.materialId,
  async (newId) => {
    if (newId && props.type !== 'add') {
      try {
        const response = await materialApi.getMaterialById(newId);
        if (response?.data?.data) {
          form.value = response.data.data;
          console.log('Loaded material data:', form.value); // 调试用
        }
      } catch (error) {
        console.error('加载物料详情失败:', error);
        ElMessage.error('加载物料详情失败');
      }
    }
  },
  { immediate: true }
);

// 监听类型变化，如果是新增则清空表单
watch(
  () => props.type,
  (newType) => {
    if (newType === 'add') {
      form.value = {};
    }
  }
);
</script>

<style lang="scss" scoped>
.material-form {
  :deep(.el-select),
  :deep(.el-cascader) {
    width: 100%;
  }
}

.conversion-hint {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
