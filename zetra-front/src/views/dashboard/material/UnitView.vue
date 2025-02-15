<template>
  <div class="unit-view">
    <el-card>
      <!-- 搜索区域 -->
      <div class="search-area">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="单位编码/名称"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="单位类型">
            <el-select v-model="searchForm.unit_type" placeholder="选择类型" clearable>
              <el-option label="基本单位" value="basic" />
              <el-option label="子单位" value="sub" />
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
        <el-button type="primary" @click="handleAdd" v-permission="'material.unit.add'">
          <el-icon><Plus /></el-icon>新增单位
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="unitList"
        border
        style="width: 100%"
      >
        <el-table-column prop="unit_code" label="单位编码" width="120" />
        <el-table-column prop="unit_name" label="单位名称" width="120" />
        <el-table-column label="单位类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.unit_type === 'basic' ? 'success' : 'warning'">
              {{ row.unit_type === 'basic' ? '基本单位' : '子单位' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
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
                v-permission="'material.unit.edit'"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                link
                @click="handleDelete(row)"
                v-permission="'material.unit.delete'"
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
          :total="total"
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
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="单位编码" prop="unit_code">
          <el-input
            v-model="form.unit_code"
            placeholder="请输入单位编码"
            :disabled="dialogType === 'edit'"
          />
        </el-form-item>
        <el-form-item label="单位名称" prop="unit_name">
          <el-input
            v-model="form.unit_name"
            placeholder="请输入单位名称"
          />
        </el-form-item>
        <el-form-item label="单位类型" prop="unit_type">
          <el-select v-model="form.unit_type" placeholder="请选择单位类型">
            <el-option label="基本单位" value="basic" />
            <el-option label="子单位" value="sub" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
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
  name: 'UnitView'
});
import { ref, computed, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Search, Plus, Refresh } from '@element-plus/icons-vue';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import type { Unit } from '@/types/material';

// 类型定义
interface SearchForm {
  keyword: string;
  unit_type: '' | 'basic' | 'sub';
}

interface UnitForm {
  unit_code: string;
  unit_name: string;
  unit_type: 'basic' | 'sub';
  description?: string;
  status: 'active' | 'inactive';
}

// 状态定义
const unitStore = useMaterialUnitStore();
const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref<'add' | 'edit'>('add');
const unitList = ref<Unit[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const formRef = ref<FormInstance>();

// 搜索表单
const searchForm = ref<SearchForm>({
  keyword: '',
  unit_type: ''
});

// 表单数据
const defaultForm: UnitForm = {
  unit_code: '',
  unit_name: '',
  unit_type: 'basic',
  description: '',
  status: 'active'
};

const form = ref<UnitForm>({ ...defaultForm });

// 表单验证规则
const rules: FormRules = {
  unit_code: [
    { required: true, message: '请输入单位编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9-_]+$/, message: '只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  unit_name: [
    { required: true, message: '请输入单位名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  unit_type: [
    { required: true, message: '请选择单位类型', trigger: 'change' }
  ]
};

// 计算属性
const dialogTitle = computed(() => {
  return dialogType.value === 'add' ? '新增单位' : '编辑单位';
});

// 方法定义
const loadData = async () => {
  loading.value = true;
  try {
    await unitStore.fetchUnits({
      page: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm.value
    });
    // 更新列表数据
    unitList.value = unitStore.units;
    total.value = unitStore.total;
  } catch (error) {
    console.error('加载单位数据失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// 搜索相关
const handleSearch = () => {
  loadData();
};

const resetSearch = () => {
  searchForm.value = {
    keyword: '',
    unit_type: ''
  };
  loadData();
};

// 分页相关
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  loadData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  loadData();
};

// 处理单位类型切换
const handleUnitTypeChange = (value: 'basic' | 'sub') => {
  if (dialogType.value === 'edit') {
    ElMessageBox.confirm('修改单位类型可能会影响相关的换算关系，是否继续？', '提示', {
      type: 'warning'
    }).then(() => {
      form.value.unit_type = value;
    }).catch(() => {
      // 还原选择
      form.value.unit_type = form.value.unit_type === 'basic' ? 'sub' : 'basic';
    });
  }
};

// CRUD 操作
const handleAdd = () => {
  dialogType.value = 'add';
  form.value = { ...defaultForm };
  dialogVisible.value = true;
};

const handleEdit = (row: Unit) => {
  dialogType.value = 'edit';
  form.value = { ...row };
  dialogVisible.value = true;
};

const handleDelete = async (row: Unit) => {
  try {
    // 检查单位是否被使用
    const response = await unitStore.checkUnitUsage(row.unit_id);
    const usage = response.data;

    if (!usage) {
      console.error('获取使用情况失败');
      ElMessage.error('检查单位使用情况失败');
      return;
    }

    if (usage.inUse) {
      let message = '该单位已被使用，无法删除：\n';
      if (usage.materials > 0) {
        message += `- 被${usage.materials}个物料使用\n`;
      }
      if (usage.conversions > 0) {
        message += `- 存在${usage.conversions}个换算关系`;
      }
      ElMessage.warning(message);
      return;
    }

    await ElMessageBox.confirm('确定要删除该单位吗？', '提示', {
      type: 'warning'
    });

    await unitStore.deleteUnit(row.unit_id);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除单位失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitLoading.value = true;
    try {
      if (dialogType.value === 'add') {
        await unitStore.createUnit(form.value);
        ElMessage.success('创建成功');
      } else {
        await unitStore.updateUnit(form.value.unit_id, form.value);
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      await loadData(); // 重新加载数据
    } catch (error) {
      console.error('保存失败:', error);
      ElMessage.error('保存失败');
    } finally {
      submitLoading.value = false;
    }
  });
};

// 生命周期
onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.unit-view {
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
  :deep(.el-select) {
    width: 100%;
  }
}
</style>
