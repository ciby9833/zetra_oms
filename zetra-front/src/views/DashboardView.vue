<template>
  <div class="dashboard-container">
    <el-container class="dashboard-layout">
      <!-- 侧边栏 -->
      <el-aside
        :width="isCollapse ? '64px' : '220px'"
        class="dashboard-aside"
      >
        <el-menu
          :default-active="activeMenu"
          class="dashboard-menu"
          :collapse="isCollapse"
          :collapse-transition="true"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>首页</template>
          </el-menu-item>

          <!-- 系统管理 -->
          <el-sub-menu
            v-if="authStore.hasRole(['super_admin', 'admin'])"
            index="/dashboard/system"
          >
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/dashboard/users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="/dashboard/system/permissions">
              <el-icon><Key /></el-icon>
              <span>权限管理</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 仓储管理 -->
          <el-sub-menu index="warehouse">
            <template #title>
              <el-icon><Box /></el-icon>
              <span>仓储管理</span>
            </template>
            <el-menu-item index="/dashboard/warehouse">
              <el-icon><House /></el-icon>
              <span>仓库管理</span>
            </el-menu-item>
            <el-menu-item index="/dashboard/warehouse-zones">
              <el-icon><Location /></el-icon>
              <span>货区管理</span>
            </el-menu-item>
            <el-menu-item index="/dashboard/suppliers">
              <el-icon><User /></el-icon>
              <span>供应商管理</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 物料管理 -->
          <el-sub-menu index="material">
            <template #title>
              <el-icon><Goods /></el-icon>
              <span>物料管理</span>
            </template>
            <el-menu-item index="/dashboard/material">
              <el-icon><Goods /></el-icon>
              <span>物料列表</span>
            </el-menu-item>
            <el-menu-item index="/dashboard/material/category">
              <el-icon><FolderOpened /></el-icon>
              <span>物料分类</span>
            </el-menu-item>
            <el-menu-item index="/dashboard/material/unit">
              <el-icon><Odometer /></el-icon>
              <span>计量单位</span>
            </el-menu-item>
            <el-menu-item index="/dashboard/material/conversion">
              <el-icon><Switch /></el-icon>
              <span>换算关系</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 出入库管理组 -->
          <el-sub-menu index="inbound">
            <template #title>
              <el-icon><Files /></el-icon>
              <span>出入库管理</span>
            </template>
            <el-menu-item index="/dashboard/inbound-orders">
              <el-icon><DArrowRight /></el-icon>
              <span slot="title">入库单</span>
            </el-menu-item>
            <!-- 如需要扩展出库、调拨等其他菜单项，可在此添加 -->
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-container>
        <!-- 顶部导航 -->
        <el-header height="60px" class="dashboard-header">
          <div class="header-content">
            <div class="left-section">
              <el-button
                class="collapse-btn"
                :icon="isCollapse ? 'Expand' : 'Fold'"
                @click="toggleCollapse"
              />
              <h2 class="logo">Zetra 管理系统</h2>
            </div>
            <div class="user-info">
              <el-dropdown trigger="click" @command="handleCommand">
                <span class="user-dropdown">
                  {{ authStore.user?.username }}
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                    <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                    <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>

        <!-- 标签区域 -->
        <div class="tabs-container">
          <el-tabs
            v-model="tabsStore.activeTab"
            type="card"
            closable
            @tab-click="handleTabClick"
            @tab-remove="handleTabClose"
          >
            <el-tab-pane
              v-for="tab in tabsStore.tabs"
              :key="tab.path"
              :name="tab.path"
            >
              <template #label>
                <span @contextmenu.prevent="onTabContextMenu(tab, $event)">
                  {{ tab.title }}
                </span>
              </template>
            </el-tab-pane>
          </el-tabs>

          <!-- 自定义右键菜单 -->
          <div
            v-if="contextMenuVisible"
            class="contextmenu"
            :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
            @click.stop
          >
            <ul>
              <li @click="closeCurrentTab">关闭</li>
              <li @click="closeRightTabs">关闭右侧标签</li>
              <li @click="closeOtherTabs">关闭其他标签</li>
              <li @click="closeAllTabs">关闭所有标签</li>
            </ul>
          </div>
        </div>

        <!-- 主内容区 -->
        <el-main class="dashboard-main">
          <Suspense>
            <template #default>
              <router-view v-slot="{ Component }">
                <keep-alive :include="tabsStore.cachedViews">
                  <component
                    :is="Component"
                    :key="route.fullPath"
                  />
                </keep-alive>
              </router-view>
            </template>
            <template #fallback>
              <div>Loading...</div>
            </template>
          </Suspense>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabsStore, type TabItem } from '@/stores/tabs';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown,
  HomeFilled,
  Setting,
  User,
  Box,
  House,
  Expand,
  Fold,
  Refresh,
  Close,
  CircleClose,
  DArrowRight,
  Remove,
  Location,
  Goods,
  FolderOpened,
  Odometer,
  Switch,
  Key,
  Files
} from '@element-plus/icons-vue';
import { useFormStore } from '@/stores/form';
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const tabsStore = useTabsStore();
const formStore = useFormStore();

// 使用 storeToRefs 来保持响应性
const { tabs, activeTab } = storeToRefs(tabsStore);

// 侧边栏状态
const isCollapse = ref(false);

// 响应式断点处理
const handleResize = () => {
  isCollapse.value = window.innerWidth < 992;
};

// 切换折叠状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

// 监听窗口大小变化
onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

// 当前激活的菜单项
const activeMenu = computed(() => route.path);

// 处理下拉菜单命令
const handleCommand = async (command: string) => {
  try {
    switch (command) {
      case 'profile':
        await router.push('/dashboard/profile');
        break;
      case 'changePassword':
        await router.push('/dashboard/change-password');
        break;
      case 'logout':
        await authStore.logout();  // 等待登出操作完成
        ElMessage.success('已退出登录');
        await router.push('/login');  // 等待路由跳转完成
        break;
    }
  } catch (error) {
    console.error('Menu command error:', error);
    ElMessage.error('操作失败，请重试');
  }
};

// 新增响应式状态管理右键菜单
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuTargetTab = ref<any>(null);

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    if (newPath !== '/login') {
      tabsStore.addTab(route);
    }
  }
);

// 处理标签页点击
const handleTabClick = (tab: any) => {
  router.push(tab.props.name);
};

// 检查并处理未保存的表单
const checkUnsavedForm = async (path: string): Promise<boolean> => {
  if (formStore.isFormDirty(path)) {
    try {
      await ElMessageBox.confirm(
        '当前表单有未保存的更改，是否继续？',
        '提示',
        {
          confirmButtonText: '继续',
          cancelButtonText: '返回编辑',
          type: 'warning'
        }
      );
      // 用户确认继续，清除表单状态
      formStore.clearFormState(path);
      return true;
    } catch {
      // 用户取消，跳转到对应表单页面
      router.push(path);
      return false;
    }
  }
  return true;
};

// 关闭标签页的处理函数
const closeTab = async (path: string) => {
  if (await checkUnsavedForm(path)) {
    tabsStore.closeTab(path, router);
  }
};

// 处理 tab 右键点击事件
function onTabContextMenu(tab: any, event: MouseEvent) {
  event.preventDefault();
  contextMenuVisible.value = true;
  // 使用鼠标坐标（可根据实际情况做偏移调整）
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuTargetTab.value = tab;
}

// 自定义右键菜单操作
function closeCurrentTab() {
  // 先隐藏右键菜单
  contextMenuVisible.value = false;
  if (contextMenuTargetTab.value) {
    tabsStore.closeTab(contextMenuTargetTab.value.path, router);
    // 当关闭当前标签如果只剩下首页则自动跳转到首页
    if (tabsStore.tabs.length === 1 && tabsStore.tabs[0].path === '/dashboard') {
      router.push('/dashboard');
    }
  }
}

function closeRightTabs() {
  contextMenuVisible.value = false;
  if (contextMenuTargetTab.value) {
    tabsStore.closeRightTabs(contextMenuTargetTab.value.path, router);
    if (tabsStore.tabs.length === 1 && tabsStore.tabs[0].path === '/dashboard') {
      router.push('/dashboard');
    }
  }
}

function closeOtherTabs() {
  // 隐藏右键菜单
  contextMenuVisible.value = false;
  if (contextMenuTargetTab.value) {
    // 关闭除选中标签外的所有标签
    tabsStore.closeOtherTabs(contextMenuTargetTab.value.path, router);
    // 强制将选中标签置为 active 并切换路由到该标签
    router.push(contextMenuTargetTab.value.path);
  }
}

function closeAllTabs() {
  contextMenuVisible.value = false;
  tabsStore.closeAllTabs(router);
  if (tabsStore.tabs.length === 1 && tabsStore.tabs[0].path === '/dashboard') {
    router.push('/dashboard');
  }
}

// 点击全局区域关闭右键菜单
function handleGlobalClick() {
  contextMenuVisible.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick);
});

// 修改菜单配置，在仓库管理后面添加物料管理菜单
const menuItems = [
  // ... 现有的菜单项保持不变
  {
    path: 'warehouse-zones',
    name: 'warehouse-zones',
    component: () => import('@/views/dashboard/WarehouseZoneView.vue'),
    meta: {
      title: '货区管理',
      requiresAuth: true,
      roles: ['admin', 'super_admin', 'user']
    }
  },
  // 添加物料管理菜单组
  {
    path: 'material',
    name: 'material',
    component: () => import('@/views/dashboard/material/MaterialListView.vue'),
    meta: {
      title: '物料管理',
      icon: 'Goods',
      requiresAuth: true,
      roles: ['admin', 'super_admin', 'user']
    },
    children: [
      {
        path: '',
        name: 'material-list',
        component: () => import('@/views/dashboard/material/MaterialListView.vue'),
        meta: {
          title: '物料列表',
          requiresAuth: true,
          roles: ['admin', 'super_admin', 'user']
        }
      },
      {
        path: 'category',
        name: 'material-category',
        component: () => import('@/views/dashboard/material/CategoryView.vue'),
        meta: {
          title: '物料分类',
          requiresAuth: true,
          roles: ['admin', 'super_admin']
        }
      },
      {
        path: 'unit',
        name: 'material-unit',
        component: () => import('@/views/dashboard/material/UnitView.vue'),
        meta: {
          title: '计量单位',
          requiresAuth: true,
          roles: ['admin', 'super_admin']
        }
      },
      {
        path: 'conversion',
        name: 'material-conversion',
        component: () => import('@/views/dashboard/material/ConversionView.vue'),
        meta: {
          title: '换算关系',
          requiresAuth: true,
          roles: ['admin', 'super_admin']
        }
      }
    ]
  },
  // ... 其他现有菜单项保持不变
];

// 关闭标签时调用 tabsStore.closeTab，并传入相应的 path
function handleTabClose(targetName: string) {
  tabsStore.closeTab(targetName, router);
}
</script>

<style scoped>
.dashboard-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background-color: #f5f7fa;
}

.dashboard-layout {
  height: 100%;
}

.dashboard-aside {
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
  transition: width 0.3s;
  overflow: hidden;
}

.dashboard-menu {
  border-right: none;
  height: 100%;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu--collapse) {
  width: 64px;
}

.dashboard-header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  padding: 0;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  padding: 8px;
  border: none;
  background: transparent;
}

.logo {
  margin: 0;
  font-size: 20px;
  color: #303133;
  white-space: nowrap;
}

.content-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
}

.tabs-bar {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 16px;
}

.dashboard-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f0f2f5;
}

/* 菜单样式优化 */
:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  display: flex;
  align-items: center;
  color: #303133;
}

:deep(.el-menu-item.is-active) {
  color: #409EFF;
}

:deep(.el-menu-item .el-icon),
:deep(.el-sub-menu__title .el-icon) {
  margin-right: 12px;
  font-size: 18px;
  color: #909399;
}

:deep(.el-menu-item.is-active .el-icon) {
  color: #409EFF;
}

/* 响应式调整 */
@media screen and (max-width: 992px) {
  .logo {
    display: none;
  }
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  padding: 8px 0;
}

.context-menu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.context-menu li {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.context-menu li:hover {
  background-color: #f5f7fa;
  color: #409EFF;
}

/* 标签页样式优化 */
.tabs-bar :deep(.el-tabs__item) {
  user-select: none;
}

.tabs-bar :deep(.el-tabs__item span) {
  display: inline-block;
  padding: 0 4px;
}

.contextmenu {
  position: fixed;
  z-index: 3000;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 5px 0;
  margin: 0;
  list-style: none;
}

.contextmenu li {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.contextmenu li:hover {
  background-color: var(--el-color-primary-light-9);
}

.contextmenu .el-icon {
  font-size: 16px;
}

/* 新增：右键菜单样式 */
.contextmenu {
  position: fixed;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.contextmenu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.contextmenu li {
  padding: 8px 16px;
  cursor: pointer;
}

.contextmenu li:hover {
  background-color: #f5f7fa;
}

/* 保证tabs容器为相对定位，用于定位上下文菜单 */
.tabs-container {
  position: relative;
}
</style>
