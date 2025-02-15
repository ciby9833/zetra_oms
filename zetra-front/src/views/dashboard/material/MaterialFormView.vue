<template>
  <div class="material-form-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ pageTitle }}</span>
          <el-button @click="handleBack">返回</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        :disabled="type === 'view'"
      >
        <!-- 基本信息 -->
        <el-divider>基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料编码" prop="material_code">
              <el-input v-model="form.material_code" placeholder="请输入物料编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料名称" prop="material_name">
              <el-input v-model="form.material_name" placeholder="请输入物料名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料分类" prop="category_id">
              <el-cascader
                v-model="form.category_id"
                :options="categoryOptions"
                :props="categoryProps"
                placeholder="请选择物料分类"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号" prop="specifications">
              <el-input v-model="form.specifications" placeholder="请输入规格型号" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 单位信息 -->
        <el-divider>单位信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基本单位" prop="unit">
              <unit-select
                v-model="form.unit"
                :unit-type="'basic'"
                @change="handleBasicUnitChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="辅助单位">
              <unit-select
                v-model="form.sub_unit"
                :unit-type="'sub'"
                :exclude-ids="form.unit ? [form.unit] : []"
                @change="handleSubUnitChange"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 换算比例 -->
        <el-row v-if="form.unit && form.sub_unit">
          <el-col :span="12">
            <el-form-item label="换算比例">
              <div class="conversion-ratio">
                1{{ basicUnitName }} = {{ form.conversion_ratio || '?' }}{{ subUnitName }}
                <el-input-number
                  v-model="form.conversion_ratio"
                  :min="0"
                  :precision="4"
                  :step="0.1"
                  style="width: 160px; margin: 0 8px;"
                />
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 其他信息 -->
        <el-divider>其他信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="保质期(天)" prop="shelf_life">
              <el-input-number
                v-model="form.shelf_life"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-switch
                v-model="form.status"
                :active-value="'active'"
                :inactive-value="'inactive'"
                :active-text="'启用'"
                :inactive-text="'停用'"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="批次管理" prop="batch_control">
              <el-switch v-model="form.batch_control" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="序列号管理" prop="serial_control">
              <el-switch v-model="form.serial_control" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="存储条件" prop="storage_conditions">
          <el-input
            v-model="form.storage_conditions"
            type="textarea"
            :rows="2"
            placeholder="请输入存储条件"
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

        <!-- 按钮组 -->
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="loading">
            保存
          </el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'MaterialFormView'
});
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useMaterialStore } from '@/stores/material';
import { useMaterialCategoryStore } from '@/stores/material/categoryStore';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import { useUnitConversionStore } from '@/stores/material/unitConversionStore';
import UnitSelect from '@/components/material/common/UnitSelect.vue';
import type { Material } from '@/types/material';
import * as materialApi from '@/api/material';
import { useFormStore } from '@/stores/form';

const route = useRoute();
const router = useRouter();
const materialStore = useMaterialStore();
const categoryStore = useMaterialCategoryStore();
const unitStore = useMaterialUnitStore();
const unitConversionStore = useUnitConversionStore();
const formStore = useFormStore();

// 状态
const loading = ref(false);
const formRef = ref<FormInstance>();
const type = ref(route.query.type as string || 'add');
const materialId = ref(route.params.id ? Number(route.params.id) : null);
const isEdit = ref(type.value === 'edit');

// 表单数据
const form = ref<Partial<Material>>({
  material_code: '',
  material_name: '',
  category_id: null,
  specifications: '',
  unit: undefined,
  sub_unit: undefined,
  conversion_ratio: undefined,
  shelf_life: undefined,
  batch_control: false,
  serial_control: false,
  status: 'active',
  storage_conditions: '',
  retrieval_conditions: ''
});

// 表单规则
const rules = ref<FormRules>({
  material_code: [
    { required: true, message: '请输入物料编码', trigger: 'blur' }
  ],
  material_name: [
    { required: true, message: '请输入物料名称', trigger: 'blur' }
  ],
  category_id: [
    { required: true, message: '请选择物料分类', trigger: 'change' }
  ],
  unit: [
    { required: true, message: '请选择基本单位', trigger: 'change' }
  ]
});

// 分类选项配置
const categoryProps = {
  value: 'category_id',
  label: 'category_name',
  children: 'children',
  checkStrictly: true,
  emitPath: false
};

// 分类选项
const categoryOptions = computed(() => categoryStore.categoryTree);

// 计算属性
const pageTitle = computed(() => {
  const titles = {
    add: '新增物料',
    edit: '编辑物料',
    view: '查看物料'
  };
  return titles[type.value] || '物料信息';
});

// 计算单位名称
const basicUnitName = computed(() => {
  const unit = unitStore.allUnits.find(u => u.unit_id === form.value.unit);
  return unit ? `${unit.unit_name}` : '';
});

const subUnitName = computed(() => {
  const unit = unitStore.allUnits.find(u => u.unit_id === form.value.sub_unit);
  return unit ? `${unit.unit_name}` : '';
});

// 方法
const loadData = async () => {
  if (materialId.value && type.value !== 'add') {
    try {
      const response = await materialApi.getMaterialById(materialId.value);
      if (response?.data?.data) {
        form.value = response.data.data;
      }
    } catch (error) {
      console.error('加载物料详情失败:', error);
      ElMessage.error('加载物料详情失败');
    }
  }
};

const handleSave = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    loading.value = true;

    // 构建提交数据
    const submitData = {
      material_code: form.value.material_code,
      material_name: form.value.material_name,
      category_id: form.value.category_id,
      specifications: form.value.specifications || '',
      unit: form.value.unit,
      sub_unit: form.value.sub_unit || null,
      conversion_rate: form.value.conversion_ratio ? Number(form.value.conversion_ratio) : null,
      shelf_life: form.value.shelf_life ? Number(form.value.shelf_life) : 0,
      batch_control: form.value.batch_control ?? false,
      serial_control: form.value.serial_control ?? false,
      status: form.value.status || 'active',
      storage_conditions: form.value.storage_conditions || '',
      retrieval_conditions: form.value.retrieval_conditions || ''
    };

    if (isEdit.value) {
      await materialStore.updateMaterial(materialId.value!, submitData);
      ElMessage.success('更新成功');
      router.back();
    } else {
      await materialStore.createMaterial(submitData);
      ElMessage.success('创建成功');
      form.value = {
        material_code: '',
        material_name: '',
        category_id: null,
        specifications: '',
        unit: undefined,
        sub_unit: undefined,
        conversion_ratio: undefined,
        shelf_life: undefined,
        batch_control: false,
        serial_control: false,
        status: 'active',
        storage_conditions: '',
        retrieval_conditions: ''
      };
    }

    // 重置表单状态
    formStore.clearFormState(route.path);

  } catch (error: any) {
    console.error('保存失败:', error);
    ElMessage.error(error.message || '保存失败');
  } finally {
    loading.value = false;
  }
};

const handleBack = () => {
  // 如果表单已修改，显示确认对话框
  if (formStore.isFormDirty(route.path)) {
    ElMessageBox.confirm('表单已修改，确定要离开吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    }).then(() => {
      formStore.clearFormState(route.path);
      router.back();
    }).catch(() => {
      // 用户取消，不做任何操作
    });
  } else {
    router.back();
  }
};

// 处理单位变化
const handleBasicUnitChange = async (unitId: number) => {
  form.value.conversion_ratio = null;
  if (unitId && form.value.sub_unit) {
    await loadConversionRatio(unitId, form.value.sub_unit);
  }
};

const handleSubUnitChange = async (value: number) => {
  if (!value || !form.unit) return;

  try {
    const ratio = await unitConversionStore.getConversion(form.unit, value);
    if (ratio) {
      form.conversion_ratio = ratio.ratio;
      form.sub_unit = value;
    }
  } catch (error) {
    ElMessage.error('获取换算比例失败，请手动输入');
    form.sub_unit = value;
  }
};

// 加载换算比例
const loadConversionRatio = async (fromUnitId: number, toUnitId: number) => {
  try {
    const conversion = await unitConversionStore.getConversion(fromUnitId, toUnitId);
    if (conversion) {
      form.value.conversion_ratio = conversion.ratio;
    } else {
      form.value.conversion_ratio = null;
    }
  } catch (error) {
    console.error('获取换算比例失败:', error);
    form.value.conversion_ratio = null;
  }
};

// 监听单位变化
watch([() => form.value.unit, () => form.value.sub_unit], async ([newUnit, newSubUnit], [oldUnit, oldSubUnit]) => {
  if (newUnit && newSubUnit && (newUnit !== oldUnit || newSubUnit !== oldSubUnit)) {
    await loadConversionRatio(newUnit, newSubUnit);
  }
});

// 生命周期
onMounted(async () => {
  await Promise.all([
    categoryStore.fetchCategoryTree(),
    unitStore.fetchUnits()
  ]);
  await loadData();
});
</script>

<style lang="scss" scoped>
.material-form-view {
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  :deep(.el-select),
  :deep(.el-cascader) {
    width: 100%;
  }

  .hint-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
  }

  .conversion-ratio {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
