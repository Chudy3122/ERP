import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Users, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { DepartmentTreeNode } from '../../types/department.types';

interface OrgChartProps {
  tree: DepartmentTreeNode[];
}

interface OrgNodeProps {
  node: DepartmentTreeNode;
  isRoot?: boolean;
}

const OrgNode: React.FC<OrgNodeProps> = ({ node, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className={`relative bg-white dark:bg-gray-800 border-2 rounded-xl shadow-md transition-all hover:shadow-lg ${
          isRoot ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
        }`}
        style={{ borderLeftColor: node.color || undefined, borderLeftWidth: '4px' }}
      >
        <div className="p-3 min-w-[180px] max-w-[220px]">
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
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {node.head.first_name} {node.head.last_name}
                </p>
              </div>
            </div>
          )}

          {/* Employee Count */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Users className="w-3 h-3" />
              <span>{node.employeeCount}</span>
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
                  {/* Horizontal line segment extending to the right (to next sibling) */}
                  {!isLast && !isOnly && (
                    <div
                      className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600"
                      style={{
                        left: '50%',
                        width: 'calc(50% + 16px + 2px)', // half of this card + gap + small overlap
                      }}
                    />
                  )}
                  {/* Horizontal line segment extending to the left (from previous sibling) */}
                  {!isFirst && !isOnly && (
                    <div
                      className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600"
                      style={{
                        right: '50%',
                        width: 'calc(50% + 16px + 2px)', // half of this card + gap + small overlap
                      }}
                    />
                  )}
                  {/* Vertical Connector to Child */}
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

  // Auto-scale to fit content (both width and height)
  useEffect(() => {
    if (!autoScale || !containerRef.current || !contentRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      // Reset scale to measure true content size
      setScale(1);
      content.style.transform = 'scale(1)';

      // Wait for DOM to update
      requestAnimationFrame(() => {
        const padding = 48;
        const containerWidth = container.clientWidth - padding;
        const containerHeight = container.clientHeight - padding;
        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;

        // Calculate scale needed to fit both dimensions
        const scaleX = contentWidth > containerWidth ? containerWidth / contentWidth : 1;
        const scaleY = contentHeight > containerHeight ? containerHeight / contentHeight : 1;

        // Use the smaller scale to ensure it fits both ways
        const newScale = Math.max(0.25, Math.min(1, scaleX, scaleY));
        setScale(newScale);
      });
    };

    // Calculate on mount and resize
    const timeoutId = setTimeout(calculateScale, 100);
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculateScale, 50);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [tree, autoScale]);

  const handleZoomIn = () => {
    setAutoScale(false);
    setScale(prev => Math.min(1.5, prev + 0.1));
  };

  const handleZoomOut = () => {
    setAutoScale(false);
    setScale(prev => Math.max(0.3, prev - 0.1));
  };

  const handleResetZoom = () => {
    setAutoScale(true);
    setScale(1);
  };

  if (tree.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {t('organization.noDepartments')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Zoom Controls */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Auto fit"
        >
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
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: 'fit-content',
          }}
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
