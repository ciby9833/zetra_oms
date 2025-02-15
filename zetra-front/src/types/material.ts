/**
 * 物料状态枚举
 */
export enum MaterialStatus {
  /** 启用 */
  Active = 'active',
  /** 禁用 */
  Disabled = 'disabled',
  /** 草稿 */
  Draft = 'draft'
}

/**
 * 单位类型枚举
 */
export enum UnitType {
  /** 基本单位 */
  Basic = 'basic',
  /** 子单位 */
  Sub = 'sub'
}

/**
 * 物料基础信息
 */
export interface MaterialBase {
  /** 物料ID */
  material_id: number;
  /** 物料编码 */
  material_code: string;
  /** 物料名称 */
  material_name: string;
  /** 物料规格 */
  specification?: string;
  /** 物料型号 */
  model?: string;
  /** 物料分类ID */
  category_id?: number;
  /** 物料状态 */
  status: MaterialStatus;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * 物料单位信息
 */
export interface MaterialUnit {
  /** 基本单位ID */
  unit: number;
  /** 子单位ID */
  sub_unit?: number;
  /** 换算比率 */
  conversion_rate?: number;
}

/**
 * 物料批次信息
 */
export interface MaterialBatch {
  /** 是否启用批次管理 */
  batch_control: boolean;
  /** 是否启用序列号管理 */
  serial_control: boolean;
  /** 保质期(天) */
  shelf_life?: number;
  /** 存储条件 */
  storage_conditions?: string;
  /** 出库要求 */
  retrieval_conditions?: string;
}

/**
 * 物料完整信息
 */
export interface Material extends MaterialBase, MaterialUnit, MaterialBatch {
  /** 分类信息 */
  category?: Category;
  /** 基本单位信息 */
  unit_info?: Unit;
  /** 子单位信息 */
  sub_unit_info?: Unit;
  id: number;
  code: string;
  name: string;
  category_name?: string;
  spec?: string;
  unit_id: number;
  unit_name?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  description?: string;
  unit: string;
  sub_unit?: string;
  specifications?: string;
  category_id?: number;
  status: 'active' | 'inactive';
  owner_id: number;
  conversion_rate?: number | null;
  creator_name: string;
  owner_name: string;
}

/**
 * 分类信息
 */
export interface Category {
  /** 分类ID */
  category_id: number;
  /** 父分类ID */
  parent_id?: number;
  /** 分类编码 */
  category_code: string;
  /** 分类名称 */
  category_name: string;
  /** 分类层级 */
  level: number;
  /** 排序号 */
  sort_order: number;
  /** 状态 */
  status: MaterialStatus;
  /** 备注 */
  remark?: string;
  /** 子分类 */
  children?: Category[];
}

/**
 * 单位信息
 */
export interface Unit {
  /** 单位ID */
  unit_id: number;
  /** 单位编码 */
  unit_code: string;
  /** 单位名称 */
  unit_name: string;
  /** 单位类型 */
  unit_type: UnitType;
  /** 状态 */
  status: MaterialStatus;
  /** 备注 */
  remark?: string;
}

/**
 * 换算关系
 */
export interface Conversion {
  /** 换算ID */
  conversion_id: number;
  /** 源单位ID */
  from_unit_id: number;
  /** 目标单位ID */
  to_unit_id: number;
  /** 换算比率 */
  conversion_rate: number;
  /** 物料ID */
  material_id?: number;
  /** 源单位名称 */
  from_unit_name?: string;
  /** 目标单位名称 */
  to_unit_name?: string;
}

/**
 * 换算检查参数
 */
export interface ConversionCheck {
  /** 源单位ID */
  from_unit_id: number;
  /** 目标单位ID */
  to_unit_id: number;
  /** 物料ID */
  material_id?: number;
}

/**
 * 单位使用情况
 */
export interface UnitUsageCheck {
  /** 是否被使用 */
  inUse: boolean;
  /** 使用该单位的物料数量 */
  materials: number;
  /** 使用该单位的换算关系数量 */
  conversions: number;
}

// 工具类型

/**
 * 物料创建参数
 */
export type MaterialCreate = Omit<Material, 'material_id' | 'created_at' | 'updated_at'>;

/**
 * 物料更新参数
 */
export type MaterialUpdate = Partial<MaterialCreate>;

/**
 * 分类创建参数
 */
export type CategoryCreate = Omit<Category, 'category_id' | 'level' | 'children'>;

/**
 * 分类更新参数
 */
export type CategoryUpdate = Partial<CategoryCreate>;

/**
 * 单位创建参数
 */
export type UnitCreate = Omit<Unit, 'unit_id'>;

/**
 * 单位更新参数
 */
export type UnitUpdate = Partial<UnitCreate>;

/**
 * 换算关系创建参数
 */
export type ConversionCreate = Omit<Conversion, 'conversion_id' | 'from_unit_name' | 'to_unit_name'>;

/**
 * 换算关系更新参数
 */
export type ConversionUpdate = Partial<ConversionCreate>;

// 常量定义

/**
 * 物料状态选项
 */
export const MATERIAL_STATUS_OPTIONS = [
  { label: '启用', value: MaterialStatus.Active },
  { label: '禁用', value: MaterialStatus.Disabled },
  { label: '草稿', value: MaterialStatus.Draft }
];

/**
 * 单位类型选项
 */
export const UNIT_TYPE_OPTIONS = [
  { label: '基本单位', value: UnitType.Basic },
  { label: '子单位', value: UnitType.Sub }
];

/**
 * 默认分页大小
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * 最大分页大小
 */
export const MAX_PAGE_SIZE = 1000;

// 编辑物料验证规则
export const materialRules = {
  material_code: [
    { required: true, message: '请输入物料编码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  material_name: [
    { required: true, message: '请输入物料名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  unit: [
    { required: true, message: '请选择基本单位', trigger: 'change' }
  ]
};

export interface UnitConversion {
  conversion_id: number;
  from_unit_id: number;
  to_unit_id: number;
  ratio: number;
  from_unit_name?: string;
  to_unit_name?: string;
  created_at?: string;
  updated_at?: string;
}
