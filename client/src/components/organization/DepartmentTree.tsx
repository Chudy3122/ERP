import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown, Search, MoreVertical, Edit, Trash2, Users } from 'lucide-react';
import type { Department, DepartmentTreeNode } from '../../types/department.types';

interface DepartmentTreeProps {
  tree: DepartmentTreeNode[];
  selectedId?: string;
  onSelect: (dept: Department) => void;
  onEdit?: (dept: Department) => void;
  onDelete?: (dept: Department) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface TreeNodeProps {
  node: DepartmentTreeNode;
  level: number;
  selectedId?: string;
  onSelect: (dept: Department) => void;
  onEdit?: (dept: Department) => void;
  onDelete?: (dept: Department) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  searchQuery: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  expandedIds,
  toggleExpanded,
  searchQuery,
}) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const matchesSearch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.code.toLowerCase().includes(searchQuery.toLowerCase())
    : true;

  const hasMatchingDescendant = (n: DepartmentTreeNode): boolean => {
    if (n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }
    return n.children?.some(hasMatchingDescendant) || false;
  };

  const shouldShow = !searchQuery || matchesSearch || hasMatchingDescendant(node);

  if (!shouldShow) return null;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(node as Department)}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(node.id);
          }}
          className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Color Indicator */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: node.color || '#6B7280' }}
        />

        {/* Name & Code */}
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate">{node.name}</span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{node.code}</span>
        </div>

        {/* Employee Count */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Users className="w-3.5 h-3.5" />
          {node.employeeCount}
        </div>

        {/* Actions Menu */}
        {(onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(node as Department);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                      {t('organization.editDepartment')}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(node as Department);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('organization.deleteDepartment')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DepartmentTree: React.FC<DepartmentTreeProps> = ({
  tree,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  searchQuery,
  onSearchChange,
}) => {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const getAllIds = (nodes: DepartmentTreeNode[]): string[] => {
      return nodes.flatMap((n) => [n.id, ...getAllIds(n.children || [])]);
    };
    setExpandedIds(new Set(getAllIds(tree)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Search Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('organization.search')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={expandAll}
            className="flex-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {t('organization.expandAll')}
          </button>
          <button
            onClick={collapseAll}
            className="flex-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {t('organization.collapseAll')}
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="p-2 max-h-[500px] overflow-y-auto">
        {tree.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('organization.noDepartments')}
          </p>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DepartmentTree;
