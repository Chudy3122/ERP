import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Users, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { DepartmentTreeNode, DepartmentEmployee } from '../../types/department.types';
import { getFileUrl } from '../../api/axios-config';

interface OrgChartProps {
  tree: DepartmentTreeNode[];
}

interface OrgNodeProps {
  node: DepartmentTreeNode;
  isRoot?: boolean;
}

const MAX_VISIBLE_EMPLOYEES = 5;

function EmployeeAvatar({ emp, size = 'sm' }: { emp: DepartmentEmployee; size?: 'sm' | 'xs' }) {
  const [error, setError] = useState(false);
  const initials = `${emp.first_name[0]}${emp.last_name[0]}`;
  const dim = size === 'xs' ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[10px]';

  return (
    <div
      className={`${dim} rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden`}
      title={`${emp.first_name} ${emp.last_name}${emp.position ? ` — ${emp.position}` : ''}`}
    >
      {emp.avatar_url && !error ? (
        <img
          src={getFileUrl(emp.avatar_url) || ''}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-semibold text-blue-700 dark:text-blue-300">{initials}</span>
      )}
    </div>
  );
}

const OrgNode: React.FC<OrgNodeProps> = ({ node, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  // Employees excluding the head
  const nonHeadEmployees = (node.employees || []).filter((e) => e.id !== node.head_id);
  const visibleEmployees = nonHeadEmployees.slice(0, MAX_VISIBLE_EMPLOYEES);
  const extraCount = nonHeadEmployees.length - visibleEmployees.length;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className={`relative bg-white dark:bg-gray-800 border-2 rounded-xl shadow-md transition-all hover:shadow-lg ${
          isRoot ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
        }`}
        style={{ borderLeftColor: node.color || undefined, borderLeftWidth: '4px' }}
      >
        <div className="p-3 min-w-[200px] max-w-[240px]">
          {/* Department Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: node.color || '#6B7280' }}
            >
              {node.code.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {node.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{node.code}</p>
            </div>
          </div>

          {/* Department Head */}
          {node.head && (
            <div className="flex items-center gap-2 p-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {node.head.avatar_url ? (
                  <img src={getFileUrl(node.head.avatar_url) || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 truncate">
                  {node.head.first_name} {node.head.last_name}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 truncate">
                  {node.head.position || 'Kierownik'}
                </p>
              </div>
            </div>
          )}

          {/* Employee list */}
          {visibleEmployees.length > 0 && (
            <div className="space-y-1">
              {visibleEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <EmployeeAvatar emp={emp} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    {emp.position && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{emp.position}</p>
                    )}
                  </div>
                </div>
              ))}
              {extraCount > 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1 pt-0.5">
                  +{extraCount} więcej
                </p>
              )}
            </div>
          )}

          {/* Footer: count + expand toggle */}
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Users className="w-3 h-3" />
              <span>{node.employeeCount} {node.employeeCount === 1 ? 'os.' : 'os.'}</span>
            </div>
            {hasChildren && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span>{node.children.length}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center">
          {/* Vertical Line Down from Parent */}
          <div className="w-0.5 h-5 bg-gray-300 dark:bg-gray-600" />

          {/* Child Nodes with connectors */}
          <div className="flex gap-4">
            {node.children.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children.length - 1;
              const isOnly = node.children.length === 1;

              return (
                <div key={child.id} className="relative flex flex-col items-center">
                  {!isLast && !isOnly && (
                    <div
                      className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600"
                      style={{ left: '50%', width: 'calc(50% + 16px + 2px)' }}
                    />
                  )}
                  {!isFirst && !isOnly && (
                    <div
                      className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600"
                      style={{ right: '50%', width: 'calc(50% + 16px + 2px)' }}
                    />
                  )}
                  <div className="w-0.5 h-5 bg-gray-300 dark:bg-gray-600" />
                  <OrgNode node={child} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const OrgChart: React.FC<OrgChartProps> = ({ tree }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [autoScale, setAutoScale] = useState(true);

  useEffect(() => {
    if (!autoScale || !containerRef.current || !contentRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      setScale(1);
      content.style.transform = 'scale(1)';

      requestAnimationFrame(() => {
        const padding = 48;
        const containerWidth = container.clientWidth - padding;
        const containerHeight = container.clientHeight - padding;
        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;

        const scaleX = contentWidth > containerWidth ? containerWidth / contentWidth : 1;
        const scaleY = contentHeight > containerHeight ? containerHeight / contentHeight : 1;
        const newScale = Math.max(0.25, Math.min(1, scaleX, scaleY));
        setScale(newScale);
      });
    };

    const timeoutId = setTimeout(calculateScale, 100);
    const resizeObserver = new ResizeObserver(() => setTimeout(calculateScale, 50));
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [tree, autoScale]);

  const handleZoomIn = () => { setAutoScale(false); setScale((prev) => Math.min(1.5, prev + 0.1)); };
  const handleZoomOut = () => { setAutoScale(false); setScale((prev) => Math.max(0.3, prev - 0.1)); };
  const handleResetZoom = () => { setAutoScale(true); setScale(1); };

  if (tree.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('organization.noDepartments')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Zoom Controls */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomOut} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleZoomIn} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleResetZoom} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Auto fit">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="p-4 flex justify-center overflow-hidden"
        style={{ height: 'calc(100vh - 300px)' }}
      >
        <div
          ref={contentRef}
          className="flex flex-col items-center gap-4"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: 'fit-content' }}
        >
          {tree.map((rootNode) => (
            <OrgNode key={rootNode.id} node={rootNode} isRoot />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrgChart;
