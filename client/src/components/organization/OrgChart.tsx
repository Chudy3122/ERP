import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Users, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { DepartmentTreeNode } from '../../types/department.types';
import { getFileUrl } from '../../api/axios-config';

interface OrgChartProps {
  tree: DepartmentTreeNode[];
}

interface OrgNodeProps {
  node: DepartmentTreeNode;
  isRoot?: boolean;
}

const MAX_VISIBLE_EMPLOYEES = Infinity;

// ── Role colour map ──────────────────────────────────────────────────────────
const ROLE_STYLES: Record<string, {
  bg: string; border: string; text: string; subtext: string; avatarBg: string; label: string; dot: string;
}> = {
  szef: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/40',
    text: 'text-red-800 dark:text-red-300',
    subtext: 'text-red-600 dark:text-red-500',
    avatarBg: 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100',
    label: 'Szef',
    dot: 'bg-red-400',
  },
  admin: {
    bg: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    border: 'border-purple-200 dark:border-purple-800/40',
    text: 'text-purple-800 dark:text-purple-300',
    subtext: 'text-purple-600 dark:text-purple-500',
    avatarBg: 'bg-gradient-to-br from-purple-200 to-pink-200 text-purple-900 dark:from-purple-800 dark:to-pink-800 dark:text-purple-100',
    label: 'Administrator',
    dot: 'bg-gradient-to-r from-purple-400 to-pink-400',
  },
  kierownik: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    text: 'text-amber-800 dark:text-amber-300',
    subtext: 'text-amber-600 dark:text-amber-500',
    avatarBg: 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100',
    label: 'Kierownik',
    dot: 'bg-amber-400',
  },
  ksiegowosc: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    text: 'text-blue-800 dark:text-blue-300',
    subtext: 'text-blue-600 dark:text-blue-500',
    avatarBg: 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100',
    label: 'Księgowość',
    dot: 'bg-blue-400',
  },
  kadry: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800/40',
    text: 'text-teal-800 dark:text-teal-300',
    subtext: 'text-teal-600 dark:text-teal-500',
    avatarBg: 'bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100',
    label: 'Kadry',
    dot: 'bg-teal-400',
  },
  sekretariat: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800/40',
    text: 'text-green-800 dark:text-green-300',
    subtext: 'text-green-600 dark:text-green-500',
    avatarBg: 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100',
    label: 'Sekretariat',
    dot: 'bg-green-400',
  },
  employee: {
    bg: '',
    border: '',
    text: 'text-gray-700 dark:text-gray-300',
    subtext: 'text-gray-400 dark:text-gray-500',
    avatarBg: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    label: 'Pracownik',
    dot: 'bg-gray-300 dark:bg-gray-600',
  },
};

const SPECIAL_ROLES = ['szef', 'admin', 'kierownik', 'ksiegowosc', 'kadry', 'sekretariat'];

function getStyle(role: string) {
  return ROLE_STYLES[role] ?? ROLE_STYLES.employee;
}

// ── Reusable person row (coloured box for special roles) ─────────────────────
function PersonRow({
  firstName, lastName, position, avatarUrl, role,
}: {
  firstName: string; lastName: string; position: string | null; avatarUrl: string | null; role: string;
}) {
  const [imgError, setImgError] = useState(false);
  const s = getStyle(role);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`;
  const isSpecial = SPECIAL_ROLES.includes(role);

  if (isSpecial) {
    return (
      <div className={`flex items-center gap-2 p-1.5 ${s.bg} border ${s.border} rounded-lg mb-1.5`}>
        <div className={`w-6 h-6 rounded-full ${s.avatarBg} flex items-center justify-center flex-shrink-0 overflow-hidden text-[10px] font-bold`}>
          {avatarUrl && !imgError ? (
            <img src={getFileUrl(avatarUrl) || ''} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${s.text} truncate`}>{firstName} {lastName}</p>
          <p className={`text-[10px] ${s.subtext} truncate`}>{position || s.label}</p>
        </div>
      </div>
    );
  }

  // regular employee — compact row
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className={`w-5 h-5 rounded-full ${s.avatarBg} flex items-center justify-center flex-shrink-0 overflow-hidden text-[8px] font-semibold`}>
        {avatarUrl && !imgError ? (
          <img src={getFileUrl(avatarUrl) || ''} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${s.text} truncate`}>{firstName} {lastName}</p>
        {position && <p className={`text-[10px] ${s.subtext} truncate`}>{position}</p>}
      </div>
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────
const LEGEND_ENTRIES = [
  { role: 'szef', label: 'Szef' },
  { role: 'admin', label: 'Administrator' },
  { role: 'kierownik', label: 'Kierownik' },
  { role: 'ksiegowosc', label: 'Księgowość' },
  { role: 'kadry', label: 'Kadry' },
  { role: 'sekretariat', label: 'Sekretariat' },
  { role: 'employee', label: 'Pracownik' },
];

function OrgLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      {LEGEND_ENTRIES.map(({ role, label }) => {
        const s = getStyle(role);
        return (
          <div key={role} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── OrgNode ──────────────────────────────────────────────────────────────────
const OrgNode: React.FC<OrgNodeProps> = ({ node, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const nonHeadEmployees = (node.employees || []).filter((e) => e.id !== node.head_id);
  const specialEmployees = nonHeadEmployees.filter((e) => SPECIAL_ROLES.includes(e.role));
  const regularEmployees = nonHeadEmployees.filter((e) => !SPECIAL_ROLES.includes(e.role));
  const visibleRegular = regularEmployees.slice(0, MAX_VISIBLE_EMPLOYEES);
  const extraCount = regularEmployees.length - visibleRegular.length;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative bg-white dark:bg-gray-800 border-2 rounded-xl shadow-md transition-all hover:shadow-lg ${
          isRoot ? 'border-[#F7941D]' : 'border-gray-200 dark:border-gray-700'
        }`}
        style={{ borderLeftColor: node.color || undefined, borderLeftWidth: '4px' }}
      >
        <div className="p-3 min-w-[200px] max-w-[240px]">
          {/* Dept header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: node.color || '#6B7280' }}
            >
              {node.code.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{node.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{node.code}</p>
            </div>
          </div>

          {/* Head */}
          {node.head && (
            <PersonRow
              firstName={node.head.first_name}
              lastName={node.head.last_name}
              position={node.head.position}
              avatarUrl={node.head.avatar_url}
              role={(node.head as any).role ?? 'kierownik'}
            />
          )}

          {/* Other special-role employees */}
          {specialEmployees.map((emp) => (
            <PersonRow
              key={emp.id}
              firstName={emp.first_name}
              lastName={emp.last_name}
              position={emp.position}
              avatarUrl={emp.avatar_url}
              role={emp.role}
            />
          ))}

          {/* Regular employees */}
          {visibleRegular.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {visibleRegular.map((emp) => (
                <PersonRow
                  key={emp.id}
                  firstName={emp.first_name}
                  lastName={emp.last_name}
                  position={emp.position}
                  avatarUrl={emp.avatar_url}
                  role={emp.role}
                />
              ))}
              {extraCount > 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1 pt-0.5">
                  +{extraCount} więcej
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Users className="w-3 h-3" />
              <span>{node.employeeCount} os.</span>
            </div>
            {hasChildren && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[#F7941D] transition-colors hover:text-[#e08317] dark:text-orange-300 dark:hover:text-orange-200"
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
          <div className="w-0.5 h-5 bg-gray-300 dark:bg-gray-600" />
          <div className="flex gap-4">
            {node.children.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children.length - 1;
              const isOnly = node.children.length === 1;
              return (
                <div key={child.id} className="relative flex flex-col items-center">
                  {!isLast && !isOnly && (
                    <div className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600" style={{ left: '50%', width: 'calc(50% + 18px)' }} />
                  )}
                  {!isFirst && !isOnly && (
                    <div className="absolute top-0 h-0.5 bg-gray-300 dark:bg-gray-600" style={{ right: '50%', width: 'calc(50% + 18px)' }} />
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

// ── OrgChart (root) ───────────────────────────────────────────────────────────
const OrgChart: React.FC<OrgChartProps> = ({ tree }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [autoScale, setAutoScale] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, positionX: 0, positionY: 0 });

  const getCenteredPosition = (nextScale: number) => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return { x: 0, y: 0 };

    const centeredY = Math.max(0, (container.clientHeight - content.scrollHeight * nextScale) / 2);
    return { x: 0, y: centeredY };
  };

  const calculateAutoScale = () => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    setScale(1);
    content.style.transform = 'scale(1)';
    requestAnimationFrame(() => {
      const padding = 48;
      const scaleX = content.scrollWidth > container.clientWidth - padding ? (container.clientWidth - padding) / content.scrollWidth : 1;
      const scaleY = content.scrollHeight > container.clientHeight - padding ? (container.clientHeight - padding) / content.scrollHeight : 1;
      const nextScale = Math.max(0.25, Math.min(1, scaleX, scaleY));
      setScale(nextScale);
      setPosition(getCenteredPosition(nextScale));
    });
  };

  useEffect(() => {
    if (!autoScale || !containerRef.current || !contentRef.current) return;

    const id = setTimeout(calculateAutoScale, 100);
    const ro = new ResizeObserver(() => setTimeout(calculateAutoScale, 50));
    ro.observe(containerRef.current);
    return () => { clearTimeout(id); ro.disconnect(); };
  }, [tree, autoScale]);

  const handleZoomIn = () => { setAutoScale(false); setScale((p) => Math.min(1.5, p + 0.1)); };
  const handleZoomOut = () => { setAutoScale(false); setScale((p) => Math.max(0.3, p - 0.1)); };
  const handleReset = () => {
    setAutoScale(true);
    setTimeout(calculateAutoScale, 0);
  };

  const handleWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;

    event.preventDefault();
    setAutoScale(false);
    const direction = event.deltaY > 0 ? -1 : 1;
    setScale((previousScale) => {
      const nextScale = Math.min(1.5, Math.max(0.3, previousScale + direction * 0.08));
      return Number(nextScale.toFixed(2));
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      positionX: position.x,
      positionY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;

    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;
    setPosition({
      x: panStartRef.current.positionX + deltaX,
      y: panStartRef.current.positionY + deltaY,
    });
  };

  const stopPanning = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  };

  if (tree.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
          <Users className="h-7 w-7" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.noDepartments')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800">
      {/* Zoom controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ctrl + scroll przybliża, przeciągnięcie tła przesuwa schemat.
        </p>
        <div className="flex items-center gap-2">
        <span className="mr-2 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomOut} className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:border-[#F7941D]/30 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-400 dark:hover:border-[#F7941D]/30 dark:hover:bg-[#F7941D]/15 dark:hover:text-orange-300" title="Pomniejsz"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={handleZoomIn} className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:border-[#F7941D]/30 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-400 dark:hover:border-[#F7941D]/30 dark:hover:bg-[#F7941D]/15 dark:hover:text-orange-300" title="Powiększ"><ZoomIn className="w-4 h-4" /></button>
        <button onClick={handleReset} className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:border-[#F7941D]/30 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-400 dark:hover:border-[#F7941D]/30 dark:hover:bg-[#F7941D]/15 dark:hover:text-orange-300" title="Dopasuj"><RotateCcw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className={`relative touch-none select-none overflow-hidden bg-gray-50/60 p-4 dark:bg-gray-900/20 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ height: 'calc(100vh - 340px)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
        onPointerLeave={() => setIsPanning(false)}
      >
        <div
          ref={contentRef}
          className="absolute left-1/2 top-4 flex flex-col items-center gap-4"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), ${position.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            width: 'fit-content',
          }}
        >
          {tree.map((rootNode) => (
            <OrgNode key={rootNode.id} node={rootNode} isRoot />
          ))}
        </div>
      </div>

      {/* Legend */}
      <OrgLegend />
    </div>
  );
};

export default OrgChart;
