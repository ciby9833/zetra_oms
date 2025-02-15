import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { RouteLocationNormalized, Router } from 'vue-router';
import { useRouter } from 'vue-router';
import { useAuthStore } from './auth';

export interface TabItem {
  title: string;
  path: string;
  name: string;
  closable: boolean;
  componentName?: string;  // 用于 keep-alive
}

export const useTabsStore = defineStore('tabs', () => {
  const authStore = useAuthStore();

  // 标签页列表
  const tabs = ref<TabItem[]>([
    {
      title: '首页',
      path: '/dashboard',
      name: 'dashboard-home',
      closable: false,
      componentName: 'HomeView'
    },
  ]);

  // 当前激活的标签页
  const activeTab = ref<string>(tabs.value[0].path);

  // 缓存的组件列表
  const cachedViews = computed(() => {
    return tabs.value
      .filter(tab => tab.componentName && tab.componentName.trim().length > 0)
      .map(tab => tab.componentName)
  });

  // 添加标签页
  function addTab(route: RouteLocationNormalized) {
    const { path, name, meta } = route;
    const title = (meta.title as string) || (name as string);

    // 获取路由对应的组件名称
    const component = route.matched[route.matched.length - 1].components?.default;
    const componentName = typeof component === 'function'
      ? component.name
      : component?.name;

    // 检查标签是否已存在
    const isExist = tabs.value.some(tab => tab.path === path);
    if (!isExist) {
      tabs.value.push({
        title,
        path,
        name: name as string,
        closable: path !== '/dashboard',
        componentName
      });

      // 添加到缓存列表
      if (componentName && !cachedViews.value.includes(componentName)) {
        cachedViews.value.push(componentName);
      }
    }
    activeTab.value = path;
  }

  // 关闭标签页
  function closeTab(targetPath: string, router: Router) {
    // 找到要关闭标签的索引
    const targetIndex = tabs.value.findIndex(tab => tab.path === targetPath);
    if (targetIndex === -1) return;

    const targetTab = tabs.value[targetIndex];

    // 如果标签不可关闭（例如首页），则直接退出
    if (!targetTab.closable) {
      return;
    }

    // 从标签列表中移除该标签
    tabs.value.splice(targetIndex, 1);

    // 如果所有标签均已关闭，则自动切换到首页，并跳转
    if (tabs.value.length === 0) {
      activeTab.value = '/dashboard/HomeView';
      router.push('/dashboard/HomeView');
      return;
    }

    // 如果关闭的是当前激活标签，则自动切换为相邻的标签
    if (activeTab.value === targetPath) {
      // 选择左侧标签，如果没有则选择第一个标签
      const nextTab = tabs.value[targetIndex - 1] || tabs.value[0];
      activeTab.value = nextTab.path;
      router.push(nextTab.path);
    }
  }

  // 关闭右侧标签页
  function closeRightTabs(targetPath: string, router: Router) {
    const targetIndex = tabs.value.findIndex(tab => tab.path === targetPath);
    if (targetIndex === -1) return;

    const tabsToClose = tabs.value.slice(targetIndex + 1).filter(tab => tab.closable);
    tabsToClose.forEach(tab => {
      if (tab.componentName) {
        const index = cachedViews.value.indexOf(tab.componentName);
        if (index > -1) {
          cachedViews.value.splice(index, 1);
        }
      }
    });
    tabs.value = tabs.value.filter((tab, index) => index <= targetIndex || !tab.closable);

    // 如果当前激活页面被关闭，从新激活目标页面
    if (!tabs.value.some(tab => tab.path === activeTab.value)) {
      router.push(targetPath);
      activeTab.value = targetPath;
    }
  }

  // 关闭其他标签页
  function closeOtherTabs(targetPath: string, router: Router) {
    tabs.value = tabs.value.filter(tab => !tab.closable || tab.path === '/dashboard');
    activeTab.value = '/dashboard';
    router.push('/dashboard');
  }

  // 关闭所有标签页
  function closeAllTabs(router: Router) {
    tabs.value = tabs.value.filter(tab => !tab.closable);
    cachedViews.value = tabs.value
      .map(tab => tab.componentName)
      .filter(Boolean) as string[];
    router.push('/dashboard');
    activeTab.value = '/dashboard';
  }

  // 清空所有标签页（用于登出时）
  function clearTabs() {
    tabs.value = [{
      title: '首页',
      path: '/dashboard',
      name: 'dashboard-home',
      closable: false,
      componentName: 'HomeView'
    }];
    activeTab.value = '/dashboard';
    cachedViews.value = ['HomeView'];
  }

  // 监听登录状态
  watch(() => authStore.isAuthenticated, (newValue) => {
    if (!newValue) {
      clearTabs();
    }
  });

  return {
    tabs,
    activeTab,
    cachedViews,
    addTab,
    closeTab,
    closeRightTabs,
    closeOtherTabs,
    closeAllTabs,
    clearTabs
  };
});
