<template>
  <div class="permission-view">
    <el-card class="permission-card">
      <template #header>
        <div class="card-header">
          <span>权限管理</span>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-area">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="用户">
            <el-input
              v-model="searchForm.keyword"
              placeholder="用户名/邮箱"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="searchForm.role" placeholder="选择角色" clearable>
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
              <el-option label="商户" value="merchant" />
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

      <!-- 用户列表 -->
      <el-table
        v-loading="loading"
        :data="userList"
        border
        style="width: 100%"
      >
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="userRole" label="角色">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.userRole)">
              {{ getRoleLabel(row.userRole) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              @click="handleManagePermissions(row)"
            >
              管理权限
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 权限管理对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="权限管理"
      width="600px"
      destroy-on-close
    >
      <permission-manager
        v-if="dialogVisible && currentUserId"
        :user-id="currentUserId"
        @success="handlePermissionUpdateSuccess"
        @cancel="dialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'PermissionView'
});
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import PermissionManager from '@/components/permission/PermissionManager.vue';
import { usePermissionStore } from '@/stores/permission';
import { userApi } from '@/api/user';

const loading = ref(false);
const dialogVisible = ref(false);
const currentUserId = ref<number | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const userList = ref([]);

const searchForm = ref({
  keyword: '',
  role: ''
});

const permissionStore = usePermissionStore();

interface User {
  userId: number;
  username: string;
  email: string;
  userRole: string;
}

// 获取用户列表
const loadUserList = async () => {
  loading.value = true;
  try {
    const response = await userApi.getSubUsers({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchForm.value.keyword,
      role: searchForm.value.role
    });

    if (response.data.success) {
      userList.value = response.data.data;
      total.value = response.data.total;
    } else {
      throw new Error(response.data.message || '获取用户列表失败');
    }
  } catch (error) {
    console.error('获取用户列表失败:', error);
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

// 角色标签类型
const getRoleType = (role: string) => {
  const types: Record<string, string> = {
    'super_admin': 'danger',
    'admin': 'warning',
    'user': 'success',
    'merchant': 'info'
  };
  return types[role] || 'info';
};

// 角色显示文本
const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    'super_admin': '超级管理员',
    'admin': '管理员',
    'user': '普通用户',
    'merchant': '商户'
  };
  return labels[role] || role;
};

// 处理权限管理
const handleManagePermissions = (user: User) => {
  currentUserId.value = user.userId;
  dialogVisible.value = true;
};

// 权限更新成功处理
const handlePermissionUpdateSuccess = () => {
  dialogVisible.value = false;
  ElMessage.success('权限更新成功');
  loadUserList();
};

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1;
  loadUserList();
};

// 重置搜索
const resetSearch = () => {
  searchForm.value = {
    keyword: '',
    role: ''
  };
  handleSearch();
};

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  loadUserList();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  loadUserList();
};

onMounted(() => {
  loadUserList();
});
</script>

<style scoped>
.permission-view {
  padding: 20px;
}

.permission-card {
  margin-bottom: 20px;
}

.search-area {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>
