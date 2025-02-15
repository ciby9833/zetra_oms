<template>
  <div class="category-view">
    <el-card>
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="primary" @click="handleAdd" v-permission="'material.category.add'">
          <el-icon><Plus /></el-icon>新增分类
        </el-button>
        <el-button type="success" @click="handleExpand">
          <el-icon><ArrowDown /></el-icon>{{ isExpandAll ? '折叠' : '展开' }}
        </el-button>
        <el-button type="warning" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </div>

      <!-- 分类树表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="categoryList"
        row-key="category_id"
        border
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column prop="category_code" label="分类编码" width="120" />
        <el-table-column prop="category_name" label="分类名称" min-width="150" />
        <el-table-column prop="level" label="层级" width="80" align="center" />
        <el-table-column prop="sort_order" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                link
                @click="handleAddSub(row)"
                v-permission="'material.category.add'"
              >
                添加子类
              </el-button>
              <el-button
                type="primary"
                link
                @click="handleEdit(row)"
                v-permission="'material.category.edit'"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                link
                @click="handleDelete(row)"
                v-permission="'material.category.delete'"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
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
        <el-form-item label="分类编码" prop="category_code">
          <el-input
            v-model="form.category_code"
            placeholder="请输入分类编码"
            :disabled="dialogType === 'edit'"
          />
        </el-form-item>
        <el-form-item label="分类名称" prop="category_name">
          <el-input
            v-model="form.category_name"
            placeholder="请输入分类名称"
          />
        </el-form-item>
        <el-form-item label="上级分类" prop="parent_id">
          <el-cascader
            v-model="form.parent_id"
            :options="categoryOptions"
            :props="{
              checkStrictly: true,
              label: 'category_name',
              value: 'category_id',
              emitPath: false
            }"
            placeholder="请选择上级分类"
            clearable
            :disabled="!!currentParentId"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number
            v-model="form.sort_order"
            :min="0"
            :max="999"
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
  name: 'CategoryView'
});
import { ref, computed, onMounted, onActivated } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, TableInstance } from 'element-plus';
import { Plus, ArrowDown, Refresh } from '@element-plus/icons-vue';
import { useMaterialCategoryStore } from '@/stores/material/categoryStore';
import type { Category } from '@/types/material';

// 常量定义
const MAX_LEVEL = 3; // 最大层级限制

// 类型定义
interface CategoryForm {
  category_id?: number;
  category_code: string;
  category_name: string;
  parent_id: number | null;
  sort_order: number;
  status: 'active' | 'inactive';
  visibility: string;
  max_level: number;
}

// Store
const categoryStore = useMaterialCategoryStore();

// 状态定义
const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref<'add' | 'edit'>('add');
const currentParentId = ref<number | null>(null);
const isExpandAll = ref(true);
const categoryList = ref<Category[]>([]);
const categoryOptions = ref<Category[]>([]);
const tableRef = ref<TableInstance>();
const formRef = ref<FormInstance>();

// 表单数据
const defaultForm: CategoryForm = {
  category_code: '',
  category_name: '',
  parent_id: null,
  sort_order: 0,
  status: 'active',
  visibility: 'private',
  max_level: 5
};

const form = ref<CategoryForm>({ ...defaultForm });

// 表单验证规则
const rules = {
  category_code: [
    { required: true, message: '请输入分类编码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9-_]+$/, message: '只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  category_name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ]
};

// 计算属性
const dialogTitle = computed(() => {
  return dialogType.value === 'add' ? '新增分类' : '编辑分类';
});

// 获取分类层级
const getCategoryLevel = (parentId: number | null): number => {
  if (!parentId) return 1;
  const parent = findCategoryById(parentId);
  return parent ? parent.level + 1 : 1;
};

// 根据ID查找分类
const findCategoryById = (categoryId: number): Category | undefined => {
  const findInTree = (categories: Category[]): Category | undefined => {
    for (const category of categories) {
      if (category.category_id === categoryId) {
        return category;
      }
      if (category.children) {
        const found = findInTree(category.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  return findInTree(categoryList.value);
};

// 检查是否可以添加子分类
const canAddSubCategory = (parentId: number | null): boolean => {
  const level = getCategoryLevel(parentId);
  return level < MAX_LEVEL;
};

// 加载分类数据
const loadData = async () => {
  try {
    loading.value = true;
    const result = await categoryStore.fetchCategoryTree();
    categoryList.value = result;
    categoryOptions.value = result;
  } catch (error) {
    console.error('获取分类数据失败:', error);
    ElMessage.error('获取分类数据失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  dialogType.value = 'add';
  currentParentId.value = null;
  form.value = { ...defaultForm };
  dialogVisible.value = true;
};

const handleAddSub = (row: Category) => {
  if (!canAddSubCategory(row.category_id)) {
    ElMessage.warning(`分类层级不能超过${MAX_LEVEL}级`);
    return;
  }

  dialogType.value = 'add';
  currentParentId.value = row.category_id;
  form.value = {
    ...defaultForm,
    parent_id: row.category_id,
    sort_order: (row.children?.length || 0) + 1
  };
  dialogVisible.value = true;
};

const handleEdit = (row: Category) => {
  dialogType.value = 'edit';
  form.value = {
    category_id: row.category_id,
    category_code: row.category_code,
    category_name: row.category_name,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
    status: row.status,
    visibility: row.visibility,
    max_level: row.max_level
  };
  dialogVisible.value = true;
};

const handleDelete = (row: Category) => {
  if (row.children?.length) {
    ElMessage.warning('请先删除子分类');
    return;
  }

  ElMessageBox.confirm('确定要删除该分类吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await categoryStore.deleteCategory(row.category_id);
      ElMessage.success('删除成功');
      loadData();
    } catch (error) {
      console.error('删除分类失败:', error);
      ElMessage.error('删除失败');
    }
  }).catch(() => {
    // 用户取消删除，不做处理
  });
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitLoading.value = true;
    try {
      if (dialogType.value === 'add') {
        await categoryStore.createCategory({
          category_code: form.value.category_code,
          category_name: form.value.category_name,
          parent_id: form.value.parent_id || null,
          sort_order: form.value.sort_order || 0,
          status: form.value.status || 'active',
          visibility: form.value.visibility || 'private',
          max_level: form.value.max_level || 5
        });
        ElMessage.success('创建成功');
      } else {
        if (!form.value.category_id) {
          throw new Error('分类ID不能为空');
        }
        await categoryStore.updateCategory({
          category_id: form.value.category_id,
          category_code: form.value.category_code,
          category_name: form.value.category_name,
          parent_id: form.value.parent_id || null,
          sort_order: form.value.sort_order || 0,
          status: form.value.status || 'active',
          visibility: form.value.visibility || 'private',
          max_level: form.value.max_level || 5
        });
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      loadData();
    } catch (error) {
      console.error('保存分类失败:', error);
      ElMessage.error('保存失败');
    } finally {
      submitLoading.value = false;
    }
  });
};

// 展开/折叠处理
const handleExpand = () => {
  isExpandAll.value = !isExpandAll.value;
  if (tableRef.value) {
    const expandRows = (data: Category[]) => {
      data.forEach(row => {
        tableRef.value?.toggleRowExpansion(row, isExpandAll.value);
        if (row.children?.length) {
          expandRows(row.children);
        }
      });
    };
    expandRows(categoryList.value);
  }
};

const handleRefresh = () => {
  loadData();
};

// 初次加载数据
onMounted(() => {
  loadData();
});

// 如果页面从 keep-alive 缓存中恢复，也可以选择刷新或者保持原状态
onActivated(() => {
  // 根据你的需求决定是否需要重新加载数据：
  // loadData();
});
</script>

<style lang="scss" scoped>
.category-view {
  .toolbar {
    margin-bottom: 16px;
  }
  :deep(.el-table) {
    .cell {
      .el-button {
        padding: 2px 0;
      }
    }
  }
}
</style>
