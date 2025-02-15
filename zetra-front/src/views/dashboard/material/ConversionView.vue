<template>
  <div class="conversion-view">
    <el-card>
      <!-- 搜索区域 -->
      <div class="search-area">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="物料">
            <el-select
              v-model="searchForm.material_id"
              placeholder="选择物料"
              clearable
              filterable
              remote
              :remote-method="handleMaterialSearch"
              :loading="materialSearchLoading"
            >
              <el-option
                v-for="item in materialOptions"
                :key="item.material_id"
                :label="item.material_name"
                :value="item.material_id"
              >
                <span>{{ item.material_code }}</span>
                <span class="ml-2">{{ item.material_name }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="单位">
            <el-select
              v-model="searchForm.unit_id"
              placeholder="选择单位"
              clearable
              filterable
            >
              <el-option
                v-for="unit in unitOptions"
                :key="unit.unit_id"
                :label="unit.unit_name"
                :value="unit.unit_id"
              >
                <span>{{ unit.unit_code }}</span>
                <span class="ml-2">{{ unit.unit_name }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>查询
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><Refresh /></el-icon>重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button
          type="primary"
          @click="handleAdd"
          v-permission="'material.conversion.add'"
        >
          <el-icon><Plus /></el-icon>新增换算关系
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="conversionStore.conversions"
        border
        style="width: 100%"
      >
        <el-table-column prop="from_unit_name" label="源单位" />
        <el-table-column prop="to_unit_name" label="目标单位" />
        <el-table-column prop="conversion_rate" label="换算比率" />
        <el-table-column prop="material_name" label="物料" />
        <el-table-column prop="direction" label="换算方向">
          <template #default="{ row }">
            {{ getDirectionLabel(row.direction) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                link
                @click="handleEdit(row)"
                v-permission="'material.conversion.edit'"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                link
                @click="handleDelete(row)"
                v-permission="'material.conversion.delete'"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="conversionStore.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="物料" prop="material_id">
          <el-select
            v-model="form.material_id"
            placeholder="选择物料（不选则为通用换算）"
            clearable
            filterable
            remote
            :remote-method="handleMaterialSearch"
            :loading="materialSearchLoading"
          >
            <el-option
              v-for="item in materialSearchResults"
              :key="item.material_id"
              :label="`${item.material_code} - ${item.material_name}`"
              :value="item.material_id"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="源单位" prop="from_unit_id">
              <unit-select v-model="form.from_unit_id" placeholder="请选择源单位" :activeOnly="true" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目标单位" prop="to_unit_id">
              <unit-select v-model="form.to_unit_id" placeholder="请选择目标单位" :activeOnly="true" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="换算比率" prop="conversion_rate">
              <el-input-number
                v-model="form.conversion_rate"
                :min="0"
                :precision="4"
                :step="0.1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="精度" prop="precision">
              <el-input-number
                v-model="form.precision"
                :min="0"
                :max="6"
                :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="换算方向" prop="direction">
          <el-radio-group v-model="form.direction">
            <el-radio label="from_to">正向换算</el-radio>
            <el-radio label="to_from">反向换算</el-radio>
            <el-radio label="both">双向换算</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="form.status"
            active-value="active"
            inactive-value="inactive"
            :active-text="'启用'"
            :inactive-text="'停用'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'MaterialConversionView'
});
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Search, Plus, Refresh } from '@element-plus/icons-vue';
import { useMaterialStore } from '@/stores/material';
import { useMaterialConversionStore } from '@/stores/material/conversionStore';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import type { Material, Unit, Conversion } from '@/types/material';
import UnitSelect from '@/components/material/common/UnitSelect.vue';

// Store
const materialStore = useMaterialStore();
const conversionStore = useMaterialConversionStore();
const unitStore = useMaterialUnitStore();

// 状态定义
const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref<'add' | 'edit'>('add');
const conversionList = ref<Conversion[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const formRef = ref<FormInstance>();
const materialSearchResults = ref([]);
const materialSearchLoading = ref(false);
const materialOptions = ref<Material[]>([]);
const unitOptions = ref<Unit[]>([]);
const toUnitOptions = ref<Unit[]>([]);

// 搜索表单
const searchForm = reactive({
  keyword: '',
  material_id: undefined,
  unit_id: undefined,
  page: 1,
  pageSize: 20
});

// 表单数据
const defaultForm: Conversion = {
  conversion_id: 0,
  from_unit_id: 0,
  to_unit_id: 0,
  from_unit_name: '',
  to_unit_name: '',
  conversion_rate: 1,
  direction: 'both',
  precision: 2,
  material_id: undefined,
  material_name: undefined,
  status: 'active'
};

const form = ref<Conversion>({ ...defaultForm });

// 表单验证规则
const rules: FormRules = {
  from_unit_id: [
    { required: true, message: '请选择源单位', trigger: 'change' }
  ],
  to_unit_id: [
    { required: true, message: '请选择目标单位', trigger: 'change' }
  ],
  conversion_rate: [
    { required: true, message: '请输入换算比率', trigger: 'blur' },
    { type: 'number', min: 0.000001, message: '换算比率必须大于0', trigger: 'blur' }
  ],
  direction: [
    { required: true, message: '请选择换算方向', trigger: 'change' }
  ],
  precision: [
    { required: true, message: '请输入精度', trigger: 'blur' },
    { type: 'number', min: 0, max: 6, message: '精度必须在0-6之间', trigger: 'blur' }
  ]
};

// 计算属性
const dialogTitle = computed(() => {
  return dialogType.value === 'add' ? '新增换算关系' : '编辑换算关系';
});

// 方法定义
const loadData = async () => {
  try {
    loading.value = true;
    await conversionStore.fetchConversions({
      ...searchForm,
      page: currentPage.value,
      pageSize: pageSize.value
    });
  } catch (error) {
    console.error('加载换算关系失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const loadUnits = async () => {
  try {
    await unitStore.fetchUnits({
      page: 1,
      pageSize: 1000
    });
    unitOptions.value = unitStore.units;
  } catch (error) {
    console.error('加载单位数据失败:', error);
    ElMessage.error('加载单位数据失败');
  }
};

// 搜索物料
const handleMaterialSearch = async (query: string) => {
  if (query && query.trim() !== '') {
    materialSearchLoading.value = true;
    try {
      const response = await materialStore.fetchMaterials({
        keyword: query,
        page: 1,
        pageSize: 10
      });
      console.log('物料搜索响应：', response);
      // 假设返回的数据格式为：response.data.data.records
      if (response.data && response.data.data) {
        materialSearchResults.value = response.data.data.records || [];
      } else {
        materialSearchResults.value = [];
      }
    } catch (error) {
      console.error('搜索物料失败:', error);
      ElMessage.error('搜索物料失败');
      materialSearchResults.value = [];
    } finally {
      materialSearchLoading.value = false;
    }
  } else {
    materialSearchResults.value = [];
  }
};

// 处理源单位变化
const handleFromUnitChange = async (unitId: number, isEdit = false) => {
  try {
    if (!isEdit) {
      // 只有在非编辑模式下才清空目标单位
      form.value.to_unit_id = undefined;
    }

    // 获取可选的目标单位列表
    const allUnits = unitStore.activeUnits;
    if (!allUnits || !allUnits.length) {
      await unitStore.fetchUnits();
    }

    // 过滤可选的目标单位
    toUnitOptions.value = unitStore.activeUnits.filter(unit => {
      // 排除源单位自身
      if (unit.unit_id === unitId) return false;

      // 如果是编辑模式且是当前换算关系的目标单位，直接返回 true
      if (isEdit && unit.unit_id === form.value.to_unit_id) return true;

      // 检查是否已存在换算关系
      const hasConversion = conversionStore.conversions.some(conv =>
        // 编辑模式下排除当前换算关系
        (isEdit ? conv.conversion_id !== form.value.conversion_id : true) &&
        // 检查是否与其他换算关系冲突
        ((conv.from_unit_id === unitId && conv.to_unit_id === unit.unit_id) ||
         (conv.to_unit_id === unitId && conv.from_unit_id === unit.unit_id))
      );

      return !hasConversion;
    });
  } catch (error) {
    console.error('处理单位变化失败:', error);
    ElMessage.error('加载目标单位失败');
  }
};

// 监听源单位变化
watch(() => form.value.from_unit_id, (newVal) => {
  if (newVal) {
    // 传入当前是否为编辑模式
    handleFromUnitChange(newVal, dialogType.value === 'edit');
  }
});

// 处理查询
const handleSearch = () => {
  currentPage.value = 1;
  loadData();
};

// 重置搜索
const resetSearch = () => {
  searchForm.material_id = undefined;
  searchForm.unit_id = undefined;
  currentPage.value = 1;
  loadData();
};

// 删除换算关系
const handleDelete = async (row: Conversion) => {
  try {
    await ElMessageBox.confirm('确认删除该换算关系吗？', '提示', {
      type: 'warning'
    });

    await conversionStore.deleteConversion(row.conversion_id);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除换算关系失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

// 新增换算关系
const handleAdd = () => {
  dialogType.value = 'add';
  form.value = { ...defaultForm };
  dialogVisible.value = true;
};

// 编辑换算关系
const handleEdit = async (row: Conversion) => {
  dialogType.value = 'edit';
  form.value = { ...row };

  // 先获取所有单位
  const allUnits = unitStore.activeUnits;
  if (!allUnits || !allUnits.length) {
    await unitStore.fetchUnits();
  }

  // 更新可选的目标单位列表
  if (form.value.from_unit_id) {
    // 以编辑模式调用 handleFromUnitChange
    await handleFromUnitChange(form.value.from_unit_id, true);
  }

  // 最后打开对话框
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitLoading.value = true;
    try {
      if (dialogType.value === 'add') {
        await conversionStore.createConversion(form.value);
        ElMessage.success('创建成功');
      } else {
        await conversionStore.updateConversion(form.value.conversion_id, form.value);
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      loadData();
    } catch (error) {
      console.error('保存换算关系失败:', error);
      ElMessage.error('保存失败');
    } finally {
      submitLoading.value = false;
    }
  });
};

// 分页相关方法
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  loadData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  loadData();
};

// 辅助函数
const getDirectionLabel = (direction: string) => {
  const map = {
    'from_to': '正向换算',
    'to_from': '反向换算',
    'both': '双向换算'
  };
  return map[direction as keyof typeof map] || direction;
};

// 生命周期
onMounted(() => {
  loadData();
  loadUnits();
});
</script>

<style lang="scss" scoped>
.conversion-view {
  .search-area {
    margin-bottom: 16px;
  }
  .toolbar {
    margin-bottom: 16px;
  }
  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
  :deep(.el-select),
  :deep(.el-cascader) {
    width: 100%;
  }
  :deep(.el-input-number) {
    width: 100%;
  }
}
</style>
