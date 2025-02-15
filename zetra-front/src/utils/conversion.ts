import type { Conversion } from '@/types/material';

/**
 * 换算错误类型
 */
export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

/**
 * 换算图节点类型
 */
interface ConversionNode {
  unitId: number;
  edges: Map<number, { rate: number; materialId?: number }>;
}

/**
 * 换算路径类型
 */
export interface ConversionPath {
  path: number[];
  rate: number;
}

/**
 * 换算工具类
 */
export class ConversionUtil {
  private nodes: Map<number, ConversionNode>;

  constructor() {
    this.nodes = new Map();
  }

  /**
   * 添加换算关系
   * @param conversion 换算关系
   */
  addConversion(conversion: Conversion): void {
    const { from_unit_id, to_unit_id, conversion_rate, material_id } = conversion;

    // 添加正向边
    let fromNode = this.nodes.get(from_unit_id);
    if (!fromNode) {
      fromNode = { unitId: from_unit_id, edges: new Map() };
      this.nodes.set(from_unit_id, fromNode);
    }
    fromNode.edges.set(to_unit_id, { rate: conversion_rate, materialId: material_id });

    // 添加反向边
    let toNode = this.nodes.get(to_unit_id);
    if (!toNode) {
      toNode = { unitId: to_unit_id, edges: new Map() };
      this.nodes.set(to_unit_id, toNode);
    }
    toNode.edges.set(from_unit_id, { rate: 1 / conversion_rate, materialId: material_id });
  }

  /**
   * 批量添加换算关系
   * @param conversions 换算关系列表
   */
  addConversions(conversions: Conversion[]): void {
    conversions.forEach(conv => this.addConversion(conv));
  }

  /**
   * 查找最短换算路径
   * @param fromUnit 源单位ID
   * @param toUnit 目标单位ID
   * @param materialId 物料ID（可选）
   * @returns 换算路径和换算比率
   * @throws {ConversionError} 找不到换算路径时抛出错误
   */
  findPath(fromUnit: number, toUnit: number, materialId?: number): ConversionPath {
    if (fromUnit === toUnit) {
      return { path: [fromUnit], rate: 1 };
    }

    // 使用 Dijkstra 算法查找最短路径
    const distances = new Map<number, number>();
    const previous = new Map<number, number>();
    const unvisited = new Set<number>();

    // 初始化
    this.nodes.forEach((_, id) => {
      distances.set(id, id === fromUnit ? 1 : Infinity);
      unvisited.add(id);
    });

    while (unvisited.size > 0) {
      // 找到距离最小的节点
      let minDistance = Infinity;
      let current = -1;
      unvisited.forEach(id => {
        const distance = distances.get(id) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          current = id;
        }
      });

      if (current === -1 || current === toUnit) break;
      unvisited.delete(current);

      // 更新相邻节点的距离
      const node = this.nodes.get(current);
      if (!node) continue;

      node.edges.forEach((edge, neighborId) => {
        if (!unvisited.has(neighborId)) return;
        if (materialId && edge.materialId && edge.materialId !== materialId) return;

        const distance = (distances.get(current) || Infinity) * edge.rate;
        if (distance < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, distance);
          previous.set(neighborId, current);
        }
      });
    }

    // 构建路径
    const path: number[] = [];
    let current = toUnit;
    while (current !== fromUnit) {
      path.unshift(current);
      const prev = previous.get(current);
      if (!prev) {
        throw new ConversionError('找不到有效的换算路径');
      }
      current = prev;
    }
    path.unshift(fromUnit);

    return {
      path,
      rate: distances.get(toUnit) || 0
    };
  }

  /**
   * 检查是否存在循环换算
   * @param materialId 物料ID（可选）
   * @returns 是否存在循环
   */
  hasCircularConversion(materialId?: number): boolean {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (unitId: number): boolean => {
      visited.add(unitId);
      recursionStack.add(unitId);

      const node = this.nodes.get(unitId);
      if (node) {
        for (const [neighborId, edge] of node.edges) {
          if (materialId && edge.materialId && edge.materialId !== materialId) continue;

          if (!visited.has(neighborId)) {
            if (hasCycle(neighborId)) return true;
          } else if (recursionStack.has(neighborId)) {
            return true;
          }
        }
      }

      recursionStack.delete(unitId);
      return false;
    };

    for (const unitId of this.nodes.keys()) {
      if (!visited.has(unitId)) {
        if (hasCycle(unitId)) return true;
      }
    }

    return false;
  }

  /**
   * 清空所有换算关系
   */
  clear(): void {
    this.nodes.clear();
  }
}

// 导出单例实例
export const conversionUtil = new ConversionUtil();
