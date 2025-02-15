import { defineStore } from 'pinia';
import { ref } from 'vue';

// 通用表格数据接口
export interface TableRecord {
  id: number | string;
  [key: string]: unknown;
}

// 搜索表单接口
export interface SearchForm {
  keyword?: string;
  status?: string;
  [key: string]: unknown;
}

// 分页配置接口
export interface Pagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

// 视图状态接口
export interface ViewState<T extends TableRecord = TableRecord> {
  searchForm: SearchForm;
  tableData: T[];
  pagination: Pagination;
  selectedRows?: T[];
  scrollPosition?: number;
}

// 默认分页配置
const defaultPagination: Pagination = {
  currentPage: 1,
  pageSize: 10,
  total: 0
};

export const useViewStore = defineStore('view', () => {
  // 存储每个视图的状态
  const viewStates = ref<Record<string, ViewState>>({});

  // 保存视图状态
  const saveViewState = <T extends TableRecord>(
    viewName: string,
    state: Partial<ViewState<T>>
  ) => {
    if (!viewStates.value[viewName]) {
      viewStates.value[viewName] = {
        searchForm: {},
        tableData: [],
        pagination: { ...defaultPagination },
        selectedRows: [],
        scrollPosition: 0
      };
    }

    viewStates.value[viewName] = {
      ...viewStates.value[viewName],
      ...state
    };
  };

  // 获取视图状态
  const getViewState = <T extends TableRecord>(
    viewName: string
  ): ViewState<T> | undefined => {
    return viewStates.value[viewName] as ViewState<T> | undefined;
  };

  // 更新搜索条件
  const updateSearchForm = (
    viewName: string,
    searchForm: SearchForm
  ) => {
    saveViewState(viewName, { searchForm });
  };

  // 更新表格数据
  const updateTableData = <T extends TableRecord>(
    viewName: string,
    tableData: T[]
  ) => {
    saveViewState<T>(viewName, { tableData });
  };

  // 更新分页信息
  const updatePagination = (
    viewName: string,
    pagination: Partial<Pagination>
  ) => {
    const currentState = viewStates.value[viewName];
    if (currentState) {
      currentState.pagination = {
        ...currentState.pagination,
        ...pagination
      };
    }
  };

  // 更新选中行
  const updateSelectedRows = <T extends TableRecord>(
    viewName: string,
    selectedRows: T[]
  ) => {
    saveViewState<T>(viewName, { selectedRows });
  };

  // 更新滚动位置
  const updateScrollPosition = (
    viewName: string,
    scrollPosition: number
  ) => {
    saveViewState(viewName, { scrollPosition });
  };

  // 清除视图状态
  const clearViewState = (viewName: string) => {
    delete viewStates.value[viewName];
  };

  // 清除所有视图状态
  const clearAllViewStates = () => {
    viewStates.value = {};
  };

  return {
    viewStates,
    saveViewState,
    getViewState,
    clearViewState,
    clearAllViewStates,
    updateSearchForm,
    updateTableData,
    updatePagination,
    updateSelectedRows,
    updateScrollPosition
  };
});
